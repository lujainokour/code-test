param([string]$BaseUrl = "http://127.0.0.1:8879/")
$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--no-sandbox','--disable-software-rasterizer','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence=0
    function Cdp($method,$parameters) {
        $script:sequence++; $id=$script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do {
            $response=$socket.Receive()|ConvertFrom-Json
            if ($response.method -eq 'Runtime.exceptionThrown') { $script:jsErrors += $response.params.exceptionDetails }
        } while ($response.id -ne $id)
        if ($response.error) {throw ($response.error|ConvertTo-Json)}
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    $script:jsErrors=@()
    $checks=@()
    Cdp 'Runtime.enable' @{} | Out-Null
    Cdp 'Page.enable' @{} | Out-Null
    function Check($name,$pass) { $script:checks+=@{name=$name;passed=[bool]$pass}; Write-Output "$pass : $name"; if(!$pass){throw "Failed: $name"} }
    function Go($page) { Cdp 'Page.navigate' @{url=($BaseUrl+$page)} | Out-Null; Start-Sleep -Milliseconds 450 }
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Learning Test',email:'learning-test@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true" | Out-Null
    Go 'pages/student/module.html?level=2'
    Check 'Level 2 cannot be opened before passing Level 1' (Eval "document.querySelector('main h1').textContent==='Level not available yet'")
    Go 'pages/student/lesson.html?lesson=variables'
    Check 'First lesson has a visible video explanation' (Eval "!document.getElementById('lesson-video-section').hidden")
    Eval "document.querySelector('input[value=`"1`"]').checked=true;document.getElementById('knowledge-form').requestSubmit();true" | Out-Null
    Check 'Correct lesson answer is saved persistently' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-learning')).lessons.includes('variables')")
    Eval "cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types','input-output','numbers'],tasks:[],assessments:{}}));true" | Out-Null
    Go 'pages/student/level-assessment.html?level=1'
    Check 'Quiz opens after lessons without requiring coding tasks' (Eval "!document.getElementById('level-assessment-form').hidden")
    Eval "levelQuizQuestions.forEach((q,i)=>document.querySelector('input[name=`"question-'+i+'`"][value=`"'+q.correct+'`"]').checked=true);document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
    Check 'Passing Level 1 is stored' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-learning')).assessments['1'].score===100")
    Go 'pages/student/dashboard.html'
    Check 'Dashboard advances to Level 2 and suggests its first lesson' (Eval "document.getElementById('current-level').textContent.includes('Level 2')&&document.querySelector('#next-actions a').href.includes('conditions')")
    Go 'pages/student/module.html?level=2'
    Check 'Level 2 renders its own four lessons and tasks' (Eval "document.querySelector('main h1').textContent==='Logic and Control Flow'&&document.querySelectorAll('[data-lesson-link]').length===4&&document.querySelector('[data-task-link]').href.includes('grade-checker')")
    Go 'pages/student/lesson.html?lesson=for-loops'
    Check 'Advanced lesson renders and links to the correct level' (Eval "document.getElementById('lesson-title').textContent==='For loops and ranges'&&document.querySelector('.module-back').href.endsWith('level=2')")
    Eval "let p=pythonCurriculum.read();p.lessons.push(...pythonLessons.map(x=>x.id));cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true" | Out-Null
    Go 'pages/student/level-assessment.html?level=2'
    Eval "levelQuizQuestions.forEach((q,i)=>document.querySelector('input[name=`"question-'+i+'`"][value=`"'+q.correct+'`"]').checked=true);document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
    Check 'Level 2 quiz saves to Level 2 without overwriting Level 1' (Eval "(()=>{const p=pythonCurriculum.read();return p.assessments['1'].score===100&&p.assessments['2'].score===100})()")
    Go 'pages/student/module.html?level=3'
    Check 'Passing Level 2 opens functions and collections' (Eval "document.querySelector('main h1').textContent==='Functions and Collections'")
    Go 'pages/student/workspace.html?task=receipt'
    Check 'Real Python prints and reads standard input' (Eval "pythonRunner.execute('print(int(input()) * 2)','6').then(r=>r.output.trim()==='12'&&!r.error)")
    Check 'Python syntax errors are returned to the student' (Eval "pythonRunner.execute('if True print(1)').then(r=>r.error.includes('SyntaxError'))")
    Check 'Infinite loops terminate at the time limit' (Eval "pythonRunner.execute('while True: pass').then(()=>false,e=>e.message.includes('5 seconds'))")
    $solutions=@{
      'student-profile'='name="Lujain"; age=21; track="Python"\nprint(f"Name: {name}\nAge: {age}\nTrack: {track}")'
      'receipt'='price=float(input())\nquantity=int(input())\nprint(f"Total: {price*quantity:.2f}")'
      'grade-checker'='score=int(input())\nprint("Passed" if score >= 70 else "Try again")'
      'sum-numbers'='n=int(input())\ntotal=0\nfor number in range(1,n+1):\n    total+=number\nprint(total)'
      'list-summary'='values=[int(value) for value in input().split()]\nprint(len(values))\nprint(sum(values))'
      'task-manager'='def count_done(tasks):\n    return sum(1 for task in tasks if task["done"])\nn=int(input())\ntasks=[]\nfor _ in range(n):\n    title,status=input().split(",")\n    tasks.append({"title":title,"done":status=="done"})\nprint(f"Completed: {count_done(tasks)}/{len(tasks)}")'
    }
    foreach($task in $solutions.Keys) {
      Go ('pages/student/workspace.html?task='+$task)
      $code=$solutions[$task].Replace('\n',"`n")
      # The profile's f-string uses escaped newlines inside the string itself.
      if($task -eq 'student-profile'){$code='name="Lujain"; age=21; track="Python"'+"`n"+'print(f"Name: {name}"); print(f"Age: {age}"); print(f"Track: {track}")'}
      $literal=ConvertTo-Json -InputObject $code -Compress
      Eval ("document.getElementById('code-editor').value="+$literal+";document.getElementById('submit-code').click();true") | Out-Null
      $result=Eval "new Promise(resolve=>{const started=Date.now();const timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled||Date.now()-started>110000){clearInterval(timer);resolve({message:document.getElementById('workspace-message').textContent,output:document.getElementById('program-output').textContent,progress:JSON.parse(cmStorage.getItem('codementor-demo-learning'))})}},100)})"
      if(!$result.progress.tasks.Contains($task)){Write-Output ($result | ConvertTo-Json -Depth 6)}
      Check ("Real execution passes all test cases: "+$task) ($result.progress.tasks.Contains($task))
    }
    Go 'pages/student/workspace.html?task=receipt'
    Eval "document.getElementById('code-editor').value='print(`"Total: 7.50`")';document.getElementById('submit-code').click();true" | Out-Null
    Check 'Hardcoded sample output fails other test cases' (Eval "new Promise(resolve=>{const timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled){clearInterval(timer);resolve(document.getElementById('program-output').textContent.includes('Needs work'))}},100)})")
    Go 'pages/student/progress.html'
    Check 'Progress shows the current level and learning report with automatic local saving' (Eval "document.querySelector('.workspace-intro').textContent.includes(pythonCurriculum.current(pythonCurriculum.read()).title)&&document.querySelector('.progress-report-link a').getAttribute('href')==='learning-report.html'&&!document.getElementById('export-progress')")
    Check 'Changing demo profiles isolates saved progress' (Eval "(()=>{cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Other',email:'other@example.com',role:'student',isDemo:true}));const isolated=cmStorage.getItem('codementor-demo-learning')===null;cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Learning Test',email:'learning-test@example.com',role:'student',isDemo:true}));return isolated&&JSON.parse(cmStorage.getItem('codementor-demo-learning')).tasks.length===6})()")
    Eval "let p=pythonCurriculum.read();p.lessons=pythonCurriculum.allLessons.map(l=>l.id);cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true" | Out-Null
    Go 'pages/student/level-assessment.html?level=3'
    Eval "levelQuizQuestions.forEach((q,i)=>document.querySelector('input[name=`"question-'+i+'`"][value=`"'+q.correct+'`"]').checked=true);document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
    Check 'Level 3 quiz completes the Foundations milestone' (Eval "pythonCurriculum.levels.filter(level=>level.id<=3).every(level=>pythonCurriculum.completed(level,pythonCurriculum.read()))")
    Eval "levelQuizQuestions.forEach((q,i)=>document.querySelector('input[name=`"question-'+i+'`"][value=`"'+((q.correct+1)%q.options.length)+'`"]').checked=true);document.getElementById('level-assessment-form').requestSubmit();true" | Out-Null
    Check 'A weaker retry preserves the best score and shows explanations' (Eval "pythonCurriculum.read().assessments['3'].score===100&&pythonCurriculum.read().assessments['3'].lastScore===0&&document.getElementById('quiz-answer-review').textContent.includes('Review this answer')")
    Go 'pages/student/progress.html'
    Check 'Progress survives clearing the tab session and signing in again' (Eval "(()=>{sessionStorage.clear();cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Learning Test',email:'learning-test@example.com',role:'student',isDemo:true}));return pythonCurriculum.read().lessons.length===pythonCurriculum.allLessons.length&&pythonCurriculum.read().tasks.length===6})()")
    Go 'pages/student/code-review.html?task=receipt'
    Check 'Code review displays actual failed test details' (Eval "document.getElementById('evaluation-title').textContent.includes('1 / 4')&&document.querySelector('.review-empty-state').textContent.includes('Needs work')")
    Go 'pages/student/project.html'
    Check 'Project page connects to the tested workspace' (Eval "document.getElementById('project-status-title').textContent==='Project passed'&&document.getElementById('project-workspace').href.includes('task=task-manager')")
    Go 'pages/student/dashboard.html'
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    Start-Sleep -Milliseconds 200
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path (Split-Path $PSScriptRoot) 'previews/learning-dashboard-desktop.png'),[Convert]::FromBase64String($shot.data))
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
    Start-Sleep -Milliseconds 200
    Check 'Dashboard fits a phone viewport' (Eval "document.documentElement.scrollWidth<=innerWidth")
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path (Split-Path $PSScriptRoot) 'previews/learning-dashboard-mobile.png'),[Convert]::FromBase64String($shot.data))
    Go 'pages/student/workspace.html?task=task-manager'
    Check 'Coding workspace fits a phone viewport' (Eval "document.documentElement.scrollWidth<=innerWidth")
    Go 'pages/student/lesson.html?lesson=variables'
    Eval "new Promise(resolve=>{const script=document.createElement('script');script.src='../../js/python-runner.js';script.onload=()=>resolve(true);document.head.append(script)})" | Out-Null
    Check 'All foundation lesson examples produce their documented output' (Eval "(async()=>{for(const lesson of pythonCurriculum.levels.filter(level=>level.id<=3).flatMap(level=>level.lessons)){const inputs={'input-output':'Lujain',numbers:'2.5\n3'};const result=await pythonRunner.execute(lesson.code,inputs[lesson.id]||'');if(result.error||result.output.trimEnd()!==lesson.output.trimEnd())return false}return true})()")
    Check 'Stop cancels a running or loading program' (Eval "(async()=>{const pending=pythonRunner.execute('while True: pass');setTimeout(()=>pythonRunner.stop(),100);return pending.then(()=>false,error=>error.message.includes('stopped'))})()")
    Go 'pages/student/learning-report.html'
    Check 'Learning report includes the full curriculum and six tasks' (Eval "document.getElementById('learning-report').textContent.includes(pythonCurriculum.allLessons.length+' of '+pythonCurriculum.allLessons.length)&&document.getElementById('learning-report').textContent.includes('6 of '+pythonCurriculum.levels.flatMap(l=>l.tasks).length)")
    Go 'pages/student/dashboard.html'
    Check 'Dashboard totals cover all levels rather than only the current level' (Eval "document.getElementById('recorded-lessons').textContent===pythonCurriculum.allLessons.length+' / '+pythonCurriculum.allLessons.length")
    Check 'Malformed saved progress is preserved and clearly reported' (Eval "(()=>{const before=cmStorage.getItem('codementor-demo-learning');cmStorage.setItem('codementor-demo-learning','{broken');dispatchEvent(new Event('pageshow'));const valid=document.getElementById('current-level').textContent==='Unavailable'&&cmStorage.getItem('codementor-demo-learning')==='{broken';cmStorage.setItem('codementor-demo-learning',before);dispatchEvent(new Event('pageshow'));return valid})()")
    $scriptNames=@(Get-ChildItem (Join-Path (Split-Path $PSScriptRoot) 'js') -Filter '*.js' | ForEach-Object {$_.Name}) | ConvertTo-Json -Compress
    $syntax=Eval ("Promise.all("+$scriptNames+".map(async name=>{try{new Function(await(await fetch(new URL('../../js/'+name,location.href))).text());return null}catch(e){return name+': '+e.message}})).then(values=>values.filter(Boolean))")
    Check 'Loaded scripts parse successfully' ($syntax.Count -eq 0)
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks | ConvertTo-Json -Depth 6 | Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/learning-upgrade-results.json')
} finally {
    if($socket){$socket.Dispose()}
    if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}
}
