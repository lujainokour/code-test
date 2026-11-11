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
    $checks=@();$heroMetrics=@()
    function Check($name,$passed){$script:checks+=@{name=$name;passed=[bool]$passed}}
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1366;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-color-scheme';value='light'})}|Out-Null
    Cdp 'Page.enable' @{}|Out-Null
    Cdp 'Page.addScriptToEvaluateOnNewDocument' @{source="addEventListener('codementor:themechange',()=>{if(window.bootstrapTheme===undefined){window.bootstrapTheme=document.documentElement.dataset.theme;window.bootstrapBeforeStyles=!document.querySelector('link[rel=stylesheet]')}});"}|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html'}|Out-Null
    Start-Sleep -Milliseconds 650
    Eval "localStorage.removeItem('codementor-ui-theme');location.reload();true"|Out-Null
    Start-Sleep -Milliseconds 600
    Check 'Device light preference applied with no saved choice' (Eval "document.documentElement.dataset.theme==='light'")
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-color-scheme';value='dark'})}|Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Device change updates theme when no manual choice exists' (Eval "document.documentElement.dataset.theme==='dark'")
    Eval "codeMentorTheme.set('light');true"|Out-Null
    Cdp 'Page.reload' @{}|Out-Null
    Start-Sleep -Milliseconds 650
    Check 'Saved light overrides dark device preference before stylesheet parsing' (Eval "document.documentElement.dataset.theme==='light'&&window.bootstrapTheme==='light'&&window.bootstrapBeforeStyles===true")
    foreach($mode in @('light','dark')){
        Eval "codeMentorTheme.set('$mode');document.activeElement.blur();true"|Out-Null
        Start-Sleep -Milliseconds 400
        $rect=Eval "(()=>{const r=document.querySelector('.theme-toggle').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:3}})()"
        Check ($mode+': capsule is 112x50 with correct pressed state') (Eval "(()=>{const b=document.querySelector('.theme-toggle'),r=b.getBoundingClientRect();return r.width===112&&r.height===50&&b.getAttribute('aria-pressed')==='$($mode -eq 'dark')'.toLowerCase()})()")
        $shot=Cdp 'Page.captureScreenshot' @{format='png';clip=$rect;captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path ('previews/cherry-toggle-'+$mode+'.png')),[Convert]::FromBase64String($shot.data))
        Eval "scrollTo({top:0,behavior:'instant'});true"|Out-Null
        $m=Eval "(()=>{const v=document.getElementById('hero-background-video'),t=document.getElementById('hero-title');return{theme:document.documentElement.dataset.theme,color:getComputedStyle(t).color,opacity:getComputedStyle(t).opacity,videoReady:v.readyState,videoWidth:v.videoWidth,videoHeight:v.getBoundingClientRect().height,heroBg:getComputedStyle(document.querySelector('.hero-video-shell')).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth}})()"
        $heroMetrics+=$m
        Check ($mode+': hero text and original video remain visible') ($m.opacity -eq '1' -and $m.color -eq 'rgb(38, 2, 4)' -and $m.videoReady -ge 2 -and $m.videoWidth -eq 1280 -and $m.videoHeight -gt 100 -and !$m.overflow)
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path ('previews/cherry-home-'+$mode+'.png')),[Convert]::FromBase64String($shot.data))
    }
    $point=Eval "(()=>{const r=document.querySelector('.theme-toggle').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()"
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=$point.x;y=$point.y}|Out-Null
    Start-Sleep -Milliseconds 220
    Check 'Mouse hover reveals only a quiet finite sheen' (Eval "Number(getComputedStyle(document.querySelector('.theme-toggle'),'::after').opacity)>.5")
    Cdp 'Input.dispatchMouseEvent' @{type='mouseMoved';x=1;y=1}|Out-Null
    Eval "document.querySelector('.theme-toggle').focus();true"|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key=' ';code='Space';windowsVirtualKeyCode=32}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key=' ';code='Space';windowsVirtualKeyCode=32}|Out-Null
    Check 'Actual Space changes theme and retains visible focus' (Eval "document.documentElement.dataset.theme==='light'&&getComputedStyle(document.activeElement).outlineWidth==='3px'")
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Enter';code='Enter';windowsVirtualKeyCode=13;text=([string][char]13);unmodifiedText=([string][char]13)}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Enter';code='Enter';windowsVirtualKeyCode=13}|Out-Null
    Start-Sleep -Milliseconds 120
    Check 'Actual Enter changes to dark' (Eval "document.documentElement.dataset.theme==='dark'")
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}|Out-Null
    Check 'Reduced motion removes thumb and cherry transitions' (Eval "getComputedStyle(document.querySelector('.theme-thumb')).transitionDuration==='0s'&&getComputedStyle(document.querySelector('.theme-cherry-art')).transitionDuration==='0s'")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Theme Tester',email:'theme@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'projects'}));true"|Out-Null
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=950;deviceScaleFactor=1;mobile=$false}|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/pages/student/dashboard.html'}|Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Dark choice follows student navigation on mobile' (Eval "document.documentElement.dataset.theme==='dark'&&document.documentElement.scrollWidth<=innerWidth")
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path 'previews/cherry-student-dark-mobile.png'),[Convert]::FromBase64String($shot.data))
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/pages/student/learning-report.html'}|Out-Null
    Start-Sleep -Milliseconds 400
    Cdp 'Emulation.setEmulatedMedia' @{media='print'}|Out-Null
    Check 'Printing restores readable light tokens and hides switch' (Eval "getComputedStyle(document.querySelector('.theme-toggle')).display==='none'&&getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()==='#260204'")
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks;hero=$heroMetrics}
    $result|ConvertTo-Json -Depth 9|Set-Content docs/theme-input-results.json -Encoding UTF8
    $result|ConvertTo-Json -Depth 9
}finally{$socket.Dispose();if(!$chrome.HasExited){Stop-Process -Id $chrome.Id}}





