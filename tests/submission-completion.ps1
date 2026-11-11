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
    $script:jsErrors=@();$checks=@()
    Cdp 'Runtime.enable' @{}|Out-Null
    Cdp 'Page.enable' @{}|Out-Null
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=('http://127.0.0.1:8901/'+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    function WaitRun {Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled||Date.now()-start>110000){clearInterval(timer);resolve(true)}},100)})"|Out-Null}
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Submission Learner',email:'submission-learner@example.com',role:'student',isDemo:true}));true" | Out-Null
    Go 'pages/student/workspace.html?task=student-profile'
    Eval "document.getElementById('code-editor').value=learningSupport.tasks['student-profile'].solution;document.getElementById('submit-code').click();true"|Out-Null
    WaitRun
    Cdp 'Page.reload' @{}|Out-Null
    Start-Sleep -Milliseconds 400
    Check 'Signed-in passing solution survives refresh' (Eval "!document.getElementById('submission-completion').hidden&&pythonCurriculum.read().tasks.includes('student-profile')")
    Go 'pages/student/certificates.html'
    Check 'Incomplete learner certificate stays locked without deleting saved tasks' (Eval "document.getElementById('print-certificate').disabled&&pythonCurriculum.read().tasks.includes('student-profile')")
    Go 'pages/student/practice.html'
    Check 'Learner practice retains passed status after visiting certificates' (Eval "[...document.querySelectorAll('.practice-task-card')].some(card=>card.querySelector('h2').textContent==='Create a student profile'&&card.querySelector('.practice-status').textContent==='Passed')")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Submission Test',email:'submission@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/workspace.html?task=task-manager'
    Check 'Unfinished project does not show completion' (Eval "document.getElementById('submission-completion').hidden")
    Eval "document.getElementById('code-editor').value=learningSupport.tasks['task-manager'].solution;document.getElementById('submit-code').click();true"|Out-Null
    WaitRun
    Check 'Four real passing checks display Project completed' (Eval "!document.getElementById('submission-completion').hidden&&document.getElementById('submission-completion-title').textContent==='Project completed!'")
    Check 'Passing code is saved separately from drafts and latest attempts' (Eval "(()=>{const p=pythonCurriculum.read();return p.tasks.includes('task-manager')&&p.submissions['task-manager'].code===learningSupport.tasks['task-manager'].solution&&p.submissions['task-manager'].passed===4})()")
    Check 'Certificate link does not claim eligibility when other requirements remain' (Eval "document.getElementById('submission-certificate-link').textContent==='Check Completion badge (local demo) requirements'")
    Check 'Dashboard, homepage and certificate links resolve correctly' (Eval "document.querySelectorAll('.submission-next-actions a').length===3&&[...document.querySelectorAll('.submission-next-actions a')].every(a=>a.href.startsWith(location.origin))")
    Go 'pages/student/workspace.html?task=task-manager'
    Check 'Reopening restores completion and enables saved-code download' (Eval "!document.getElementById('submission-completion').hidden&&!document.getElementById('download-submission').disabled")
    Eval "document.getElementById('code-editor').value='print(0)';document.getElementById('code-editor').dispatchEvent(new Event('input'));true"|Out-Null
    Check 'Changed draft is clearly distinguished from passing submission' (Eval "document.getElementById('submission-draft-note').textContent.includes('draft has changed')")
    Eval "window.actualBlob=null;URL.createObjectURL=blob=>{window.actualBlob=blob;return 'blob:isolated-test'};HTMLAnchorElement.prototype.click=function(){window.downloadedFilename=this.download};document.getElementById('download-submission').click();true"|Out-Null
    Check 'Download contains passing solution rather than changed draft' (Eval "actualBlob.text().then(code=>code===learningSupport.tasks['task-manager'].solution&&downloadedFilename==='task-manager-submitted.py')")
    Eval "document.getElementById('submit-code').click();true"|Out-Null
    WaitRun
    Check 'Failed retry does not overwrite the last passing submission' (Eval "(()=>{const p=pythonCurriculum.read();return p.taskResults['task-manager'].passed===0&&p.submissions['task-manager'].passed===4&&p.submissions['task-manager'].code===learningSupport.tasks['task-manager'].solution})()")
    Eval "var p=pythonCurriculum.read();p.lessons=pythonCurriculum.allLessons.map(l=>l.id);p.tasks=pythonCurriculum.levels.filter(l=>l.id<=3).flatMap(l=>l.tasks);p.assessments={'1':{score:100},'2':{score:100},'3':{score:100}};cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true"|Out-Null
    Check 'Completed path offers View your certificate' (Eval "document.getElementById('submission-certificate-link').textContent==='View your Completion badge (local demo)'")
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}|Out-Null
    Check 'Completion actions fit the phone viewport' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Eval "var p=pythonCurriculum.read();delete p.submissions;p.taskResults['task-manager']={passed:4,total:4,code:learningSupport.tasks['task-manager'].solution,cases:[]};cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true"|Out-Null
    Check 'Existing passing records also show completion without rerunning' (Eval "!document.getElementById('submission-completion').hidden&&!document.getElementById('download-submission').disabled")
    # Reproduce the reported refresh -> practice -> certificate journey with real submissions.
    foreach ($taskId in @('student-profile','receipt','grade-checker','sum-numbers','list-summary','task-manager')) {
        Go ('pages/student/workspace.html?task=' + $taskId)
        Eval "document.getElementById('code-editor').value=learningSupport.tasks['$taskId'].solution;document.getElementById('submit-code').click();true"|Out-Null
        WaitRun
        Check "$taskId passing submission is recorded" (Eval "(()=>{const p=pythonCurriculum.read(),s=p.submissions['$taskId'];return s&&s.passed===s.total&&p.tasks.includes('$taskId')})()")
        Cdp 'Page.reload' @{}|Out-Null
        Start-Sleep -Milliseconds 400
        Check "$taskId survives browser refresh" (Eval "!document.getElementById('submission-completion').hidden&&!document.getElementById('download-submission').disabled")
    }
    Go 'pages/student/practice.html'
    $practiceState=Eval "({statuses:[...document.querySelectorAll('.practice-status')].map(el=>el.textContent),savedTasks:JSON.parse(cmStorage.getItem('codementor-demo-learning')).tasks,url:location.href})"
    if($practiceState.statuses.Count -ne 12 -or @($practiceState.statuses|Where-Object {$_ -eq 'Passed'}).Count -ne 6){Write-Output ($practiceState|ConvertTo-Json -Depth 5)}
    Check 'Practice preserves the six foundation passes alongside the new tasks' (Eval "document.querySelectorAll('.practice-status').length===12&&[...document.querySelectorAll('.practice-status')].filter(el=>el.textContent==='Passed').length===6")
    Go 'pages/student/certificates.html'
    Check 'Certificate accepts the six saved coding submissions' (Eval "!document.getElementById('print-certificate').disabled")
    Cdp 'Page.reload' @{}|Out-Null
    Start-Sleep -Milliseconds 400
    Check 'Certificate remains available after refresh' (Eval "!document.getElementById('print-certificate').disabled")
    Go 'pages/student/practice.html'
    Check 'Visiting certificates preserves all six task completions' (Eval "[...document.querySelectorAll('.practice-status')].filter(el=>el.textContent==='Passed').length===6")
    Eval "window.savedProfile=cmStorage.getItem('codementor-demo-session');sessionStorage.clear();true"|Out-Null
    Go 'pages/student/dashboard.html'
    Check 'Profile survives loss of tab session on dashboard' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-session')).email==='submission@example.com'&&document.getElementById('account-name').textContent==='Submission Test'")
    Go 'pages/student/progress.html'
    Check 'Progress retains all tasks with restored profile' (Eval "pythonCurriculum.read().tasks.length===6")
    Eval "cmStorage.removeItem('codementor-demo-session');true"|Out-Null
    Check 'Explicit logout removes profile and keeps learner records out of guest storage' (Eval "cmStorage.getItem('codementor-demo-session')===null&&cmStorage.getItem('codementor-demo-learning')===null")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Submission Test',email:'submission@example.com',role:'student',isDemo:true}));true"|Out-Null
    Go 'pages/student/certificates.html'
    Check 'Signing back into same profile restores certificate and solutions' (Eval "!document.getElementById('print-certificate').disabled&&Object.keys(pythonCurriculum.read().submissions).length===6")
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/submission-completion-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}
