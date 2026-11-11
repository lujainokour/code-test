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
    Open 'pages/student/dashboard.html'
    Eval "cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'basics',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:pythonCurriculum.levels[0].lessons.map(x=>x.id),tasks:[],assessments:{'1':{score:100}}}));true" | Out-Null
    Open 'pages/student/workspace.html'
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    Check 'Learning steps sit outside the two-panel coding grid' (Eval "document.querySelector('.student-journey').parentElement.id==='coding-main' && document.querySelector('.coding-work-area').children.length===2")
    Check 'Default task and journey agree on Level 1 even when current progress is Level 2' (Eval "document.querySelector('.student-journey-context').textContent.includes('Level 1:') && document.querySelector('.coding-task-panel > .eyebrow').textContent.includes('LEVEL 1') && document.getElementById('task-level-back').href.endsWith('module.html?level=1')")
    Check 'Duplicate page header is removed and draft status belongs to the editor' (Eval "!document.querySelector('.onboarding-header') && document.querySelector('.coding-editor-header #draft-status')!==null")
    Check 'Hints are available on demand and irrelevant input fields are hidden' (Eval "document.querySelector('details.task-support') && !document.querySelector('details.task-support').open && document.getElementById('program-input').hidden")
    Check 'Code review link belongs to the output panel' (Eval "document.querySelector('.coding-output-panel #open-code-review')!==null")
    foreach($size in @(@{w=1440;h=1000},@{w=1280;h=900},@{w=1024;h=900},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        foreach($theme in @('light','dark')) {
            Eval "document.documentElement.dataset.theme='$theme';window.scrollTo(0,0);true" | Out-Null
            Start-Sleep -Milliseconds 250
            Check "$($size.w)/$theme no horizontal page overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            Check "$($size.w)/$theme journey is above both coding panels" (Eval "(()=>{const j=document.querySelector('.student-journey').getBoundingClientRect(),a=document.querySelector('.coding-task-panel').getBoundingClientRect(),b=document.querySelector('.coding-editor-panel').getBoundingClientRect();return j.bottom<=a.top && j.bottom<=b.top && j.width>0.9*document.querySelector('.coding-work-area').getBoundingClientRect().width})()")
            if($size.w -gt 1100) {
                Check "$($size.w)/$theme instructions and wide editor share a row" (Eval "(()=>{const a=document.querySelector('.coding-task-panel').getBoundingClientRect(),b=document.querySelector('.coding-editor-panel').getBoundingClientRect();return Math.abs(a.top-b.top)<2&&b.left>=a.right&&b.width>=480})()")
            } else {
                Check "$($size.w)/$theme editor follows instructions at full width" (Eval "(()=>{const a=document.querySelector('.coding-task-panel').getBoundingClientRect(),b=document.querySelector('.coding-editor-panel').getBoundingClientRect();return b.top>=a.bottom&&Math.abs(a.width-b.width)<2&&document.getElementById('code-editor').getBoundingClientRect().width>250})()")
            }
            if($size.w -eq 1440 -or $size.w -eq 390) {
                $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
                [IO.File]::WriteAllBytes((Join-Path $root ('docs/coding-layout-'+$size.w+'-'+$theme+'.png')),[Convert]::FromBase64String($shot.data))
            }
        }
    }
    Eval "document.getElementById('code-editor').value='# preserved editor draft';document.getElementById('save-draft').click();true" | Out-Null
    Cdp 'Page.reload' @{} | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Saved code survives refresh after the layout change' (Eval "document.getElementById('code-editor').value==='# preserved editor draft'")
    Eval "document.querySelector('.task-support').open=true;document.getElementById('reveal-hint').click();true" | Out-Null
    Check 'Hint controls still reveal the first hint' (Eval "document.querySelectorAll('#task-hints li').length===1")
    Eval "document.getElementById('code-editor').value=learningSupport.tasks['student-profile'].solution;document.getElementById('submit-code').click();true" | Out-Null
    Check 'Submission finishes within the test timeout' (Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled){clearInterval(timer);resolve(true)}else if(Date.now()-start>55000){clearInterval(timer);resolve(false)}},100)})")
    Check 'Actual Python submission still passes and records completion' (Eval "pythonCurriculum.read().tasks.includes('student-profile') && !document.getElementById('submission-completion').hidden")
    Open 'pages/student/workspace.html?task=grade-checker'
    Check 'Level 2 task carries matching heading, journey and back link' (Eval "document.querySelector('.coding-task-panel > .eyebrow').textContent.includes('LEVEL 2') && document.querySelector('.student-journey-context').textContent.includes('Level 2:') && document.getElementById('task-level-back').href.endsWith('module.html?level=2')")
    Check 'Input-requiring tasks retain their standard input editor' (Eval "!document.getElementById('program-input').hidden")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
