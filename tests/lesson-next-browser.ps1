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
    Eval "cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'basics',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:pythonCurriculum.levels[0].lessons.map(l=>l.id),tasks:[],assessments:{'1':{score:100}}}));true" | Out-Null
    Open 'pages/student/lesson.html?lesson=boolean-logic'
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    Check 'Next action shares the answer button row' (Eval "document.querySelector('.lesson-answer-actions').contains(document.getElementById('next-activity')) && document.querySelector('.lesson-answer-actions button[type=submit]')!==null")
    Check 'Back link identifies the actual lesson level' (Eval "document.querySelector('.module-back').textContent.includes('Logic and Control Flow')")
    Eval "[...document.querySelectorAll('[name=knowledge-answer]')].find(input=>input.value==='0').checked=true;document.querySelector('#knowledge-form button').scrollIntoView({behavior:'instant',block:'center'});window.initialJourney=document.querySelector('.student-journey');window.beforeAnswerScroll=scrollY;document.getElementById('knowledge-form').requestSubmit();true" | Out-Null
    Check 'Wrong answers do not record lesson completion' (Eval "!pythonCurriculum.read().lessons.includes('boolean-logic') && document.getElementById('knowledge-feedback').classList.contains('is-error')")
    Check 'Updating progress keeps the same journey element in place' (Eval "initialJourney===document.querySelector('.student-journey')")
    foreach($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        Open 'pages/student/lesson.html?lesson=boolean-logic'
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();[...document.querySelectorAll('[name=knowledge-answer]')].find(input=>input.value==='1').checked=true;document.querySelector('#knowledge-form button').scrollIntoView({behavior:'instant',block:'center'});window.beforeSubmitY=scrollY;window.questionTop=document.getElementById('knowledge-form').getBoundingClientRect().top;document.querySelector('#knowledge-form button').focus({preventScroll:true});document.getElementById('knowledge-form').requestSubmit();true" | Out-Null
        Start-Sleep -Milliseconds 150
        Check "$($size.w) answer saves without returning to the top" (Eval "pythonCurriculum.read().lessons.includes('boolean-logic') && scrollY>500 && Math.abs(document.getElementById('knowledge-form').getBoundingClientRect().top-questionTop)<120")
        Check "$($size.w) bottom Next leads to the following lesson" (Eval "document.getElementById('next-activity').href.endsWith('lesson.html?lesson=for-loops') && document.getElementById('complete-lesson').hidden")
        Check "$($size.w) Check answer and Next are side by side" (Eval "(()=>{const a=document.querySelector('.lesson-answer-actions button').getBoundingClientRect(),b=document.getElementById('next-activity').getBoundingClientRect();return Math.abs(a.top-b.top)<2 && b.left>=a.right && Math.abs(a.height-b.height)<2})()")
        Check "$($size.w) no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
        Eval "document.querySelector('.lesson-answer-actions').scrollIntoView({behavior:'instant',block:'center'});true" | Out-Null
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path $root ('docs/lesson-next-'+$size.w+'.png')),[Convert]::FromBase64String($shot.data))
        Eval "document.getElementById('next-activity').click();true" | Out-Null
        Start-Sleep -Milliseconds 500
        Check "$($size.w) clicking Next opens the correct lesson" (Eval "new URLSearchParams(location.search).get('lesson')==='for-loops'")
    }
    Open 'pages/student/lesson.html?lesson=while-loops'
    Eval "document.getElementById('complete-lesson').scrollIntoView({behavior:'instant',block:'center'});document.getElementById('complete-lesson').click();true" | Out-Null
    Check 'Manual completion remains available and saves progress' (Eval "pythonCurriculum.read().lessons.includes('while-loops')")
    Check 'The last lesson leads to practice and quiz for the same level' (Eval "document.getElementById('next-activity').href.endsWith('module.html?level=2') && document.getElementById('next-activity').textContent.includes('practice & quiz')")
    Eval "document.getElementById('next-activity').click();true" | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Final continuation opens the Level 2 overview' (Eval "location.pathname.endsWith('/module.html') && new URLSearchParams(location.search).get('level')==='2'")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
