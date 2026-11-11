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
    Cdp 'Emulation.setFocusEmulationEnabled' @{enabled=$true}|Out-Null
    function Check($name,$passed){$script:checks+=@{name=$name;passed=[bool]$passed}}
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1366;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html'}|Out-Null
    Start-Sleep -Milliseconds 400
    Eval "codeMentorTheme.set('dark');true"|Out-Null
    Check 'Exact eight requested dark tokens' (Eval "Object.entries({'--page-bg':'#10151d','--surface-bg':'#19222d','--surface-alt':'#222e3b','--line-color':'#354655','--text-color':'#e6f0f5','--text-muted':'#a9bac8','--ice-accent':'#a8d5e5','--cherry-accent':'#a93450'}).every(([k,v])=>getComputedStyle(document.documentElement).getPropertyValue(k).trim().toLowerCase()===v)")
    Eval "document.getElementById('student-services').scrollIntoView({behavior:'instant'});true"|Out-Null
    Start-Sleep -Milliseconds 800
    Check 'Home surfaces and footer are navy with flat card fills' (Eval "['.site-header','.site-footer','#student-services .services-card'].every(s=>getComputedStyle(document.querySelector(s)).backgroundColor==='rgb(25, 34, 45)')&&getComputedStyle(document.querySelector('#student-services .services-card')).backgroundImage==='none'")
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path 'previews/dark-navy-services.png'),[Convert]::FromBase64String($shot.data))
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Palette Tester',email:'palette@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'projects'}));true"|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/pages/student/dashboard.html'}|Out-Null
    Start-Sleep -Milliseconds 450
    Check 'Workspace background, sidebar, text and link roles' (Eval "getComputedStyle(document.body).backgroundColor==='rgb(16, 21, 29)'&&getComputedStyle(document.querySelector('.workspace-sidebar')).backgroundColor==='rgb(25, 34, 45)'&&getComputedStyle(document.querySelector('h1')).color==='rgb(230, 240, 245)'&&getComputedStyle(document.querySelector('.dashboard-text-link')).color==='rgb(168, 213, 229)'")
    # The independent first-visit guide is modal. Dismiss it before testing
    # the dashboard action; do not try to focus an inert element behind it.
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true"|Out-Null
    Start-Sleep -Milliseconds 100
    Eval "(()=>{const links=[...document.querySelectorAll('a[href],button,input,select,textarea,summary')].filter(n=>!n.disabled&&n.tabIndex>=0&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');const index=links.indexOf(document.querySelector('.button-primary'));if(index<1)throw new Error('Primary action has no preceding keyboard target');links[index-1].focus();return true})()"|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Start-Sleep -Milliseconds 250
    Check 'Primary action is cherry, white text and ice focus' (Eval "(()=>{const button=document.querySelector('.button-primary'),s=getComputedStyle(button);return document.activeElement===button&&s.backgroundColor==='rgb(169, 52, 80)'&&s.color==='rgb(255, 255, 255)'&&s.outlineStyle==='solid'&&s.outlineColor==='rgb(168, 213, 229)'})()")
    $point=Eval "(()=>{const r=document.querySelector('.button-primary').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()"
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=$point.x;y=$point.y}|Out-Null
    Start-Sleep -Milliseconds 250
    Check 'Hover keeps cherry action and white readable text' (Eval "(()=>{const s=getComputedStyle(document.querySelector('.button-primary'));return s.backgroundColor==='rgb(169, 52, 80)'&&s.color==='rgb(255, 255, 255)'})()")
    $ratios=Eval "(()=>{const rgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16)),l=c=>{const a=c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722},r=(a,b)=>{a=l(rgb(a));b=l(rgb(b));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};return{text:r('E6F0F5','19222D'),muted:r('A9BAC8','222E3B'),link:r('A8D5E5','222E3B'),button:r('FFFFFF','A93450')}})()"
    Check 'Text, muted text, links and cherry action exceed 4.5:1' ($ratios.text -ge 4.5 -and $ratios.muted -ge 4.5 -and $ratios.link -ge 4.5 -and $ratios.button -ge 4.5)
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=950;deviceScaleFactor=1;mobile=$false}|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/pages/student/dashboard.html'}|Out-Null
    Start-Sleep -Milliseconds 400
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path 'previews/dark-navy-mobile.png'),[Convert]::FromBase64String($shot.data))
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks;contrast=$ratios}
    $result|ConvertTo-Json -Depth 8|Set-Content docs/dark-palette-results.json -Encoding UTF8
    $result|ConvertTo-Json -Depth 8
}finally{$socket.Dispose();if(!$chrome.HasExited){Stop-Process -Id $chrome.Id}}


