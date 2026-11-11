$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$profile = Join-Path $env:TEMP ('cm-access-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8876') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($attempt=0; $attempt -lt 50; $attempt++) {
        try { Invoke-WebRequest 'http://127.0.0.1:8876/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break }
        catch { Start-Sleep -Milliseconds 100 }
    }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0
    function Cdp($method,$parameters) {
        $script:sequence++
        $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $response=$socket.Receive()|ConvertFrom-Json } while ($response.id -ne $id)
        if ($response.error) { throw ($response.error|ConvertTo-Json) }
        return $response.result
    }
    function Eval($expression) {
        $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}
        if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}
        return $result.result.value
    }
    function Open($path) {
        $navigation = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8876/' + $path)}
        if ($navigation.errorText) {throw $navigation.errorText}
        Start-Sleep -Milliseconds 600
    }
    function Check($name,$passed) { if (!$passed) {throw $name}; Write-Output "PASS $name" }
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 600
    Open 'pages/student/progress.html'
    Eval "cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'basics',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:pythonCurriculum.levels.slice(0,2).flatMap(l=>l.lessons.map(x=>x.id)),tasks:[],assessments:{'1':{score:100},'2':{score:25}}}));true" | Out-Null
    Cdp 'Page.reload' @{} | Out-Null
    Start-Sleep -Milliseconds 600
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    Check 'Page displays the real current level and quiz score' (Eval "document.querySelector('.progress-content-grid h2').textContent==='Logic and Control Flow' && document.getElementById('assessment-status').textContent.includes('25%')")
    Check 'Progress and next action come before optional utilities' (Eval "document.querySelector('.dashboard-stats').offsetTop<document.querySelector('.progress-tools').offsetTop && document.querySelector('.progress-next-step').offsetTop<document.querySelector('.progress-tools').offsetTop")
    Check 'Progress page has no file picker, backup controls or backup script' (Eval "!document.querySelector('input[type=file]') && !document.getElementById('export-progress') && !document.getElementById('progress-backup') && ![...document.scripts].some(s=>s.src.includes('learning-backup.js'))")
    Eval "window.beforeLayoutProgress=cmStorage.getItem('codementor-demo-learning');true" | Out-Null
    foreach($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        foreach($theme in @('light','dark')) {
            Eval "document.documentElement.dataset.theme='$theme';window.scrollTo(0,0);true" | Out-Null
            Start-Sleep -Milliseconds 300
            Check "$($size.w)/$theme primary action is visible and readable" (Eval "(()=>{const a=document.getElementById('next-step-link'),c=getComputedStyle(a),r=a.getBoundingClientRect();return r.width>100&&r.height>=44&&c.opacity==='1'&&c.color!==c.backgroundColor})()")
            Check "$($size.w)/$theme has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
            [IO.File]::WriteAllBytes((Join-Path $root ('docs/progress-layout-'+$size.w+'-'+$theme+'.png')),[Convert]::FromBase64String($shot.data))
        }
    }
    Check 'Viewing and resizing progress never changes saved learning records' (Eval "cmStorage.getItem('codementor-demo-learning')===beforeLayoutProgress")
    Cdp 'Page.reload' @{} | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Automatic progress still survives refresh' (Eval "pythonCurriculum.read().assessments['2'].score===25 && document.getElementById('completed-lessons').textContent==='4 / 4'")
    Check 'Learning report remains available' (Eval "document.querySelector('.progress-report-link a').href.endsWith('/student/learning-report.html')")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
