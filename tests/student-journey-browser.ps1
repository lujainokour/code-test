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
    Cdp 'Runtime.enable' @{} | Out-Null
    function Follow($selector) { $url=Eval "document.querySelector('$selector').href"; Cdp 'Page.navigate' @{url=$url} | Out-Null; Start-Sleep -Milliseconds 450 }
    function WaitTask { Check 'Python task finished within the test timeout' (Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled){clearInterval(timer);resolve(true)}else if(Date.now()-start>55000){clearInterval(timer);resolve(false)}},100)})") }
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 650
    Check 'A new student starts with learning preferences' (Eval "location.pathname.endsWith('/onboarding.html')")
    Eval "document.getElementById('onboarding-language').value='python';document.querySelector('[name=experience][value=beginner]').checked=true;document.querySelector('[name=goal][value=foundations]').checked=true;document.getElementById('onboarding-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 650
    Check 'Preferences lead to dashboard without requiring optional placement' (Eval "location.pathname.endsWith('/dashboard.html') && document.querySelector('#next-actions a').href.endsWith('lesson.html?lesson=variables')")
    Check 'Only four primary learning links are expanded on the dashboard' (Eval "document.querySelector('.shell-nav-group').querySelectorAll('a').length===4 && !document.getElementById('booking-count')")
    Check 'Dashboard describes all six levels' (Eval "document.querySelector('[aria-labelledby=path-title]').textContent.includes('Six Python levels')")
    Check 'Learning journey has four steps and a current marker' (Eval "document.querySelectorAll('.student-journey nav a').length===4 && document.querySelector('.student-journey [aria-current=step]')")
    Follow '#next-actions a'
    for($i=0;$i -lt 4;$i++) {
        Eval "const lesson=pythonCurriculum.selected.lessons.find(l=>l.id===new URLSearchParams(location.search).get('lesson'));[...document.querySelectorAll('input[name=knowledge-answer]')].find(input=>Number(input.value)===lesson.correct).checked=true;document.getElementById('knowledge-form').requestSubmit();true" | Out-Null
        Check "Lesson $($i+1) answer records completion" (Eval "pythonCurriculum.read().lessons.includes(new URLSearchParams(location.search).get('lesson'))")
        Follow '#next-activity'
    }
    Check 'Last lesson returns to the correct level overview for practice and quiz' (Eval "location.pathname.endsWith('/module.html') && new URLSearchParams(location.search).get('level')==='1' && !document.getElementById('assessment-link').hidden")
    Open 'pages/student/dashboard.html'
    Check 'After lessons the next step is coding practice with a quiz alternative' (Eval "document.querySelector('#next-actions a').href.includes('workspace.html?task=student-profile') && document.querySelectorAll('#next-actions a').length===2")
    Follow '#next-actions a'
    Eval "document.getElementById('code-editor').value=learningSupport.tasks['student-profile'].solution;document.getElementById('submit-code').click();true" | Out-Null
    WaitTask
    Check 'Real Python checks save a passing task' (Eval "pythonCurriculum.read().tasks.includes('student-profile') && !document.getElementById('submission-completion').hidden")
    Open 'pages/student/dashboard.html'
    Check 'Dashboard advances to the remaining task' (Eval "document.querySelector('#next-actions a').href.includes('task=receipt')")
    Follow '#next-actions a'
    Eval "document.getElementById('code-editor').value=learningSupport.tasks.receipt.solution;document.getElementById('submit-code').click();true" | Out-Null
    WaitTask
    Open 'pages/student/dashboard.html'
    Check 'After practice dashboard offers the level quiz' (Eval "document.querySelector('#next-actions a').href.endsWith('level-assessment.html?level=1')")
    Follow '#next-actions a'
    Eval "levelQuizQuestions.forEach((q,i)=>[...document.querySelectorAll('input[name=question-'+i+']')].find(input=>Number(input.value)===q.correct).checked=true);document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
    Check 'Passing quiz unlocks the next level' (Eval "pythonCurriculum.read().assessments['1'].score===100 && pythonCurriculum.available(pythonCurriculum.levels[1],pythonCurriculum.read())")
    Open 'pages/student/dashboard.html'
    Check 'Returning to dashboard resumes Level 2' (Eval "document.getElementById('current-level').textContent.includes('Level 2') && document.querySelector('#next-actions a').href.endsWith('lesson.html?lesson=conditions')")
    Follow '#next-actions a'
    Check 'Mentor receives the current lesson and Level 2 context' (Eval "[...document.querySelectorAll('a')].some(a=>a.href.includes('mentor.html?level=2&lesson=conditions'))")
    Check 'Journey practice link keeps the Level 2 task context' (Eval "document.querySelectorAll('.student-journey nav a')[2].href.includes('task=grade-checker')")
    Open 'pages/student/learning-path.html'
    Check 'Foundations project stays locked before Level 3 is complete' (Eval "document.querySelectorAll('.roadmap-card')[6].textContent.includes('COMPLETE LEVELS 1')")
    Eval "const p=pythonCurriculum.read();p.lessons=pythonCurriculum.allLessons.map(l=>l.id);p.tasks=pythonCurriculum.levels.flatMap(l=>l.tasks);p.assessments=Object.fromEntries(pythonCurriculum.levels.map(l=>[l.id,{score:100}]));cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true" | Out-Null
    Open 'pages/student/dashboard.html'
    Check 'All-six-level completion leads to progress instead of a repeated upgrade request' (Eval "document.getElementById('current-level').textContent==='Python path completed' && document.querySelector('#next-actions a').href.endsWith('/progress.html')")
    foreach($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        Check "$($size.w) dashboard has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
        [IO.File]::WriteAllBytes((Join-Path $root ('docs/student-journey-'+$size.w+'.png')),[Convert]::FromBase64String($shot.data))
    }
    Follow '#next-actions a'
    Check 'Progress page keeps the connected journey navigation' (Eval "document.querySelector('.student-journey [aria-current=step]').textContent.includes('Quiz & progress')")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
