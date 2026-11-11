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
        do { $response=$socket.Receive()|ConvertFrom-Json; if($response.method -eq "Runtime.exceptionThrown"){$script:jsErrors+=$response.params.exceptionDetails} } while ($response.id -ne $id)
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
    function Check($name,$passed) { $script:checks+=@{name=$name;passed=[bool]$passed}; if($passed){Write-Output ("PASS "+$name)}else{Write-Output ("FAIL "+$name)} }
    $script:checks=@(); $script:jsErrors=@()
    Cdp 'Runtime.enable' @{} | Out-Null
    Open 'index.html'
    Eval "localStorage.clear();sessionStorage.clear();cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Language A',email:'language-a@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables'],tasks:['student-profile'],assessments:{}}));sessionStorage.setItem('original-python',cmStorage.getItem('codementor-demo-learning'));true" | Out-Null
    Open 'pages/student/dashboard.html'
    Check 'Language switcher lists every catalog entry and its readiness' (Eval "document.querySelectorAll('.workspace-topbar [role=option]').length===languageCatalog.entries.length && document.querySelector('.workspace-topbar [role=option][data-language=javascript]').textContent.includes('Ready') && document.querySelector('.workspace-topbar [role=option][data-language=rust]').textContent.includes('Coming soon')")
    Eval "document.querySelector('.workspace-topbar .lang-switch-button').click();document.querySelector('.workspace-topbar [role=option][data-language=javascript]').click();true" | Out-Null
    Start-Sleep -Milliseconds 750
    Check 'Selecting JavaScript switches the dashboard and starts separate progress' (Eval "cmStorage.activeLanguage()==='javascript' && pythonCurriculum.id==='javascript' && pythonCurriculum.levels.length===3 && document.getElementById('selected-language').textContent==='JavaScript' && cmStorage.getItem('codementor-demo-learning')===null")
    Open 'pages/student/learning-path.html'
    Check 'JavaScript roadmap uses three levels and the shared switcher' (Eval "document.getElementById('track-title').textContent==='JavaScript · 3 levels' && !!document.querySelector('.workspace-topbar .lang-switch') && document.querySelector('#roadmap-list h2').textContent==='JavaScript Foundations'")
    Open 'pages/student/lesson.html?lesson=variables'
    # Use the completion control so the check does not depend on option-name markup.
    Eval "document.getElementById('complete-lesson').click();true" | Out-Null
    Check 'JavaScript lesson completion is saved in its own language' (Eval "pythonCurriculum.read().lessons.includes('variables') && !localStorage.getItem('codementor-learning-v1:language-a%40example.com:codementor-demo-learning').includes('JavaScript')")
    Open 'pages/student/workspace.html?task=receipt'
    $cases = Eval "(async()=>{const results=[];for(const task of Object.values(pythonCurriculum.tasks)){for(const [i,test] of task.tests.entries()){try{const result=await javascriptRunner.execute(task.solution+(task.verify||''),test.input);results.push({name:task.id+' case '+(i+1),passed:!result.error&&result.output.trimEnd()===test.output.trimEnd(),error:result.error,output:result.output,expected:test.output});}catch(error){results.push({name:task.id+' case '+(i+1),passed:false,error:error.message});}}}return results;})()"
    foreach($case in $cases) { Check ('Real JavaScript worker: '+$case.name) $case.passed; if(!$case.passed){Write-Output ($case|ConvertTo-Json -Compress)} }
    Check 'Checking reference solutions alone does not award progress' (Eval "pythonCurriculum.read().tasks.length===0")
    Check 'JavaScript has no document or network fetch capability' (Eval "javascriptRunner.execute('console.log(typeof document);console.log(typeof fetch);').then(r=>!r.error&&r.output==='undefined\nundefined\n')")
    Check 'JavaScript infinite loop is terminated at five seconds' (Eval "(async()=>{const start=Date.now();try{await javascriptRunner.execute('while(true) {}');return false}catch(error){return error.message.includes('5 seconds')&&Date.now()-start>=4500&&Date.now()-start<9000}})()")
    Check 'Stop cancels execution and a later worker can run' (Eval "(async()=>{const promise=javascriptRunner.execute('while(true) {}').catch(error=>error.message);setTimeout(()=>javascriptRunner.stop(),50);const stopped=await promise;const next=await javascriptRunner.execute('console.log(readLine())','Ready');return stopped.includes('stopped')&&next.output==='Ready\n'})()")
    Eval "document.getElementById('code-editor').value=pythonCurriculum.tasks.receipt.solution;document.getElementById('submit-code').click();true" | Out-Null
    Check 'JavaScript workspace submission runs checks and records a passing solution' (Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled||Date.now()-start>15000){clearInterval(timer);resolve(pythonCurriculum.read().tasks.includes('receipt')&&pythonCurriculum.read().submissions.receipt.passed===4)}},100)})")
    Open 'pages/student/mentor.html?task=receipt'
    Check 'Mentor keeps JavaScript task context and prepared hints' (Eval "document.getElementById('context-name').textContent.includes('JavaScript receipt') && document.getElementById('context-code-text').textContent.includes('console.log')")
    Open 'pages/student/learning-report.html'
    Check 'JavaScript report counts only active-language work' (Eval "document.getElementById('learning-report').textContent.includes('Selected path: JavaScript') && document.getElementById('learning-report').textContent.includes('JavaScript lessons completed: 1 of 12') && document.getElementById('learning-report').textContent.includes('Coding tasks passed: 1 of 6')")
    for($level=1;$level -le 3;$level++) {
        Open ('pages/student/module.html?level='+$level)
        $lessonIds=Eval 'pythonCurriculum.selected.lessons.map(lesson=>lesson.id)'
        foreach($lessonId in $lessonIds) {
            Open ('pages/student/lesson.html?lesson='+$lessonId)
            Eval "const lesson=pythonLessons.find(item=>item.id==='$lessonId');[...document.querySelectorAll('#knowledge-options input')].find(input=>Number(input.value)===lesson.correct).checked=true;document.getElementById('knowledge-form').requestSubmit();true" | Out-Null
            Check ('JavaScript lesson answer saves completion: '+$lessonId) (Eval "pythonCurriculum.read().lessons.includes('$lessonId')")
        }
        Open ('pages/student/module.html?level='+$level)
        $taskIds=Eval 'pythonCurriculum.selected.tasks'
        foreach($taskId in $taskIds) {
            Open ('pages/student/workspace.html?task='+$taskId)
            Eval "document.getElementById('code-editor').value=pythonCurriculum.tasks['$taskId'].solution;document.getElementById('submit-code').click();true" | Out-Null
            Check ('JavaScript task submission awards its own completion: '+$taskId) (Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled||Date.now()-start>15000){clearInterval(timer);resolve(pythonCurriculum.read().tasks.includes('$taskId'))}},100)})")
        }
        Open ('pages/student/level-assessment.html?level='+$level)
        Eval "levelQuizQuestions.forEach((question,index)=>{[...document.querySelectorAll('#level-assessment-form input')].find(input=>input.name==='question-'+index&&Number(input.value)===question.correct).checked=true});document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
        Check ('JavaScript level quiz saves and unlocks progression: '+$level) (Eval "pythonCurriculum.read().assessments['$level'].score===100 && pythonCurriculum.completed(pythonCurriculum.selected,pythonCurriculum.read())")
    }
    Open 'pages/student/certificates.html'
    Check 'JavaScript milestone uses its own completed lessons, quizzes and tasks' (Eval "!document.getElementById('print-certificate').disabled && document.getElementById('certificate-requirements').textContent.includes('12 JavaScript lessons') && pythonCurriculum.read().tasks.length===6")
    Open 'pages/student/dashboard.html'
    Check 'Completed JavaScript path leads to progress rather than Python or Premium' (Eval "document.getElementById('current-level').textContent==='JavaScript path completed' && document.querySelector('#next-actions a').href.endsWith('/progress.html')")
    foreach($width in @(1440,390)) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 600)} | Out-Null
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        Check ("JavaScript language selector and dashboard fit $width pixels") (Eval 'document.documentElement.scrollWidth<=innerWidth+1')
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
        [IO.File]::WriteAllBytes((Join-Path $root ('docs/phase1-javascript-'+$width+'.png')),[Convert]::FromBase64String($shot.data))
    }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    Open 'pages/student/placement-intro.html'
    Check 'Missing JavaScript placement bank is explicit and does not manufacture a score' (Eval "document.querySelector('main h1').textContent.includes('Placement is not available') && cmStorage.getItem('codementor-demo-placement')===null && [...document.querySelectorAll('main a')].some(a=>a.getAttribute('href')==='learning-path.html')")
    Open 'pages/student/dashboard.html'
    Eval "learningLanguage.select('python','language-a@example.com');true" | Out-Null
    Open 'pages/student/dashboard.html'
    Check 'Returning to Python preserves original progress byte for byte' (Eval "cmStorage.getItem('codementor-demo-learning')===sessionStorage.getItem('original-python') && pythonCurriculum.levels.length===6")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Language B',email:'language-b@example.com',role:'student',isDemo:true}));true" | Out-Null
    Eval "document.querySelector('.workspace-topbar .lang-switch-button').click();document.querySelector('.workspace-topbar [role=option][data-language=javascript]').click();true" | Out-Null
    Check 'A stale switcher cannot save a choice for another account' (Eval "cmStorage.getItem('codementor-demo-language')===null && document.querySelector('.workspace-topbar .lang-switch-message').textContent.includes('account changed')")
    Open 'pages/student/dashboard.html'
    Check 'Account B has separate language and progress' (Eval "cmStorage.activeLanguage()==='python' && cmStorage.getItem('codementor-demo-learning')===null")
    Eval "document.querySelector('.workspace-topbar .lang-switch-button').click();document.querySelector('.workspace-topbar [role=option][data-language=rust]').click();true" | Out-Null
    Check 'Coming-soon languages open availability details and are never made active from the switcher' (Eval "cmStorage.activeLanguage()==='python' && !!document.querySelector('dialog.lang-availability[open]')")
    Eval "learningLanguage.select('rust','language-b@example.com');location.reload();true" | Out-Null
    Start-Sleep -Milliseconds 750
    Check 'Coming-soon selection shows honest availability instead of Python content' (Eval "document.querySelector('main h1').textContent==='Rust: coming soon' && !document.getElementById('code-editor') && !window.activeCurriculum")
    Eval "[...document.querySelectorAll('main button')].find(b=>b.textContent==='Notify me on this device').click();true" | Out-Null
    Check 'Coming-soon notification is an owner-local interest flag' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-language-notifications')).rust===true && document.querySelector('main').textContent.includes('No email')")
    Eval "[...document.querySelectorAll('main button')].find(b=>b.textContent==='Continue Python').click();true" | Out-Null
    Start-Sleep -Milliseconds 750
    Check 'Coming-soon user can continue Python without losing records' (Eval "cmStorage.activeLanguage()==='python' && !!window.activeCurriculum && pythonCurriculum.id==='python'")
    $routes = Get-Content (Join-Path $root 'docs/page-routes.json') -Raw | ConvertFrom-Json
    $studentRoutes = @($routes.PSObject.Properties.Value | Where-Object { $_ -like 'pages/student/*' })
    foreach($language in @('python','javascript')) {
        Open 'pages/student/dashboard.html'
        Eval "learningLanguage.select('$language','language-b@example.com');true" | Out-Null
        foreach($route in $studentRoutes) {
            Open $route
            Check ("$language student page renders: $route") (Eval "!!document.querySelector('main h1')")
        }
    }
    Check 'No uncaught JavaScript exceptions on either language student pages' ($script:jsErrors.Count -eq 0)
    @{checks=$script:checks;jsErrors=$script:jsErrors}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $root 'docs/language-switch-results.json') -Encoding UTF8
    if (@($script:checks|Where-Object {!$_.passed}).Count -or $script:jsErrors.Count) { throw 'Language workflow checks failed; see docs/language-switch-results.json' }

} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
