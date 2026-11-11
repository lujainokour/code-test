$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
$socket = New-Object System.Net.WebSockets.ClientWebSocket
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:sequence=0
    function Cdp($method,$parameters) {
        $script:sequence++; $id=$script:sequence
        $bytes=[Text.Encoding]::UTF8.GetBytes((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        $socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
        do {
            $stream=New-Object IO.MemoryStream
            do { $buffer=New-Object byte[] 65536; $part=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult(); $stream.Write($buffer,0,$part.Count) } while (!$part.EndOfMessage)
            $response=[Text.Encoding]::UTF8.GetString($stream.ToArray())|ConvertFrom-Json; $stream.Dispose()
        } while ($response.id -ne $id)
        if ($response.error) {throw ($response.error|ConvertTo-Json)}
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    $checks=@()
    function Check($name,$passed) { $script:checks += @{name=$name;passed=[bool]$passed} }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1280;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html'} | Out-Null
    Start-Sleep -Milliseconds 600
    Eval "window.s=document.getElementById('student-services');window.cs=[...s.querySelectorAll('.services-card')];window.ls=cs.map(c=>c.querySelector('a'));window.layout=cs.map(c=>[c.offsetTop,c.offsetHeight]);s.scrollIntoView({behavior:'instant'});true" | Out-Null
    Start-Sleep -Milliseconds 800
    Check 'Entry runs once, staggered and finite in real browser time' (Eval "cs.every(c=>c.classList.contains('service-enter')&&getComputedStyle(c).animationIterationCount==='1')&&cs.map(c=>getComputedStyle(c).animationDelay).join()==='0s,0.07s,0.14s,0.21s'")
    Check 'No layout shifts caused by entry' (Eval "JSON.stringify(layout)===JSON.stringify(cs.map(c=>[c.offsetTop,c.offsetHeight]))")
    $point=Eval "(()=>{const r=cs[0].getBoundingClientRect();return{x:r.left+20,y:r.top+20}})()"
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=$point.x;y=$point.y} | Out-Null
    Start-Sleep -Milliseconds 220
    Check 'Real mouse hover lifts card and moves arrow' (Eval "getComputedStyle(cs[0]).transform.includes('-4')&&getComputedStyle(cs[0].querySelector('.service-arrow')).transform.includes('2, -2')&&getComputedStyle(cs[0],'::before').opacity==='1'")
    $buttonPoint=Eval "(()=>{const r=ls[0].getBoundingClientRect();return{x:r.left+20,y:r.top+20}})()"
    Cdp 'Input.dispatchMouseEvent' @{type='mousePressed';x=$buttonPoint.x;y=$buttonPoint.y;button='left';buttons=1;clickCount=1} | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Press produces a brief button scale response' (Eval "getComputedStyle(ls[0]).transform.includes('0.985')")
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=1;y=1;buttons=1} | Out-Null
    Cdp 'Input.dispatchMouseEvent' @{type='mouseReleased';x=1;y=1;button='left';buttons=0;clickCount=1} | Out-Null
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=1;y=1} | Out-Null
    Eval "ls[0].focus();true" | Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Tab';code='Tab';windowsVirtualKeyCode=9} | Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Tab';code='Tab';windowsVirtualKeyCode=9} | Out-Null
    Start-Sleep -Milliseconds 230
    Check 'Actual Tab advances to next service with visible keyboard outline' (Eval "document.activeElement===ls[1]&&getComputedStyle(ls[1]).outlineWidth==='2px'&&getComputedStyle(cs[1]).transform.includes('-4')")
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Enter';code='Enter';windowsVirtualKeyCode=13} | Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Enter';code='Enter';windowsVirtualKeyCode=13} | Out-Null
    Start-Sleep -Milliseconds 400
    Check 'Actual Enter takes a guest to login with the mentoring return destination' (Eval "location.pathname.endsWith('/login.html')&&new URLSearchParams(location.search).get('next').endsWith('pages/services/peer-mentoring.html')")
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})} | Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html#student-services'} | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Reduced motion disables entry and focus displacement' (Eval "(()=>{const cards=[...document.querySelectorAll('#student-services .services-card')];cards[0].querySelector('a').focus();return cards.every(c=>getComputedStyle(c).animationName==='none')&&getComputedStyle(cards[0]).transform==='none'})()")
    Cdp 'Emulation.setScriptExecutionDisabled' @{value=$true} | Out-Null
    Cdp 'Page.reload' @{} | Out-Null
    Start-Sleep -Milliseconds 500
    Cdp 'Emulation.setScriptExecutionDisabled' @{value=$false} | Out-Null
    Check 'With JavaScript disabled all four cards remain visible' (Eval "[...document.querySelectorAll('#student-services .services-card')].every(c=>!c.classList.contains('service-enter')&&getComputedStyle(c).opacity==='1'&&getComputedStyle(c).display!=='none')")
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks}
    $result|ConvertTo-Json -Depth 8|Set-Content docs/services-input-results.json -Encoding UTF8
    $result|ConvertTo-Json -Depth 8
} finally {
    $socket.Dispose()
    # Stop only the disposable browser process created by this test.
    if (!$chrome.HasExited) { Stop-Process -Id $chrome.Id }
}
