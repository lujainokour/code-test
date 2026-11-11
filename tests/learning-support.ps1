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
    $script:jsErrors=@();$checks=@()
    Cdp 'Runtime.enable' @{} | Out-Null
    Cdp 'Page.enable' @{} | Out-Null
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=($BaseUrl+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    function WaitRun {Eval "new Promise(resolve=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled||Date.now()-start>110000){clearInterval(timer);resolve(document.getElementById('workspace-message').textContent)}},100)})"}
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Support Test',email:'support@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/workspace.html?task=receipt'
    Check 'Explained solution is locked before attempting' (Eval "document.getElementById('reveal-solution').disabled&&document.getElementById('task-solution').hidden")
    Eval "document.getElementById('reveal-hint').click();true"|Out-Null
    Check 'First click reveals only the first hint' (Eval "document.querySelectorAll('#task-hints li').length===1&&document.getElementById('reveal-hint').textContent.includes('2 of 2')")
    Go 'pages/student/workspace.html?task=receipt'
    Check 'Revealed hints persist on reopening the task' (Eval "document.querySelectorAll('#task-hints li').length===1")
    Eval "document.getElementById('reveal-hint').click();document.getElementById('reveal-hint').click();true"|Out-Null
    Check 'Hints stop after two distinct steps' (Eval "document.querySelectorAll('#task-hints li').length===2&&document.getElementById('reveal-hint').disabled")
    Eval "document.getElementById('code-editor').value='print(0)';document.getElementById('submit-code').click();true"|Out-Null
    WaitRun|Out-Null
    Check 'An actual failed attempt unlocks the solution' (Eval "!document.getElementById('reveal-solution').disabled")
    Eval "document.getElementById('reveal-solution').click();true"|Out-Null
    Check 'Explained solution reveals code and explanation without completing the task' (Eval "!document.getElementById('task-solution').hidden&&document.getElementById('task-solution-code').textContent.includes('float(input())')&&JSON.parse(cmStorage.getItem('codementor-demo-learning')).tasks.length===0")
    Check 'Solution does not replace the student draft' (Eval "document.getElementById('code-editor').value==='print(0)'")
    Go 'pages/student/workspace.html?task=receipt'
    Check 'Solution is hidden again on reopening while attempt access persists' (Eval "document.getElementById('task-solution').hidden&&!document.getElementById('reveal-solution').disabled")
    Go 'pages/student/progress.html'
    Check 'Failed task adds targeted lesson and retry links to review plan on My progress' (Eval "document.querySelector('#dashboard-review a[href*=numbers]')!==null&&document.querySelector('#dashboard-review a[href*=receipt]')!==null")
    Check 'Review plan removes task-only flags after a successful retry' (Eval "(()=>{const p=pythonCurriculum.read();p.taskResults.receipt.passed=p.taskResults.receipt.total;p.taskResults.receipt.cases=[{passed:true}];return learningSupport.reviewPlan(p,pythonCurriculum).length===0})()")
    Check 'Review plan detects latest quiz errors despite an earlier passing best score' (Eval "(()=>{const p={version:1,lessons:[],tasks:[],assessments:{'1':{score:100,lastScore:0,answers:[0,0,0,0],submittedAt:'2026-01-01T00:00:00Z'}}};return learningSupport.reviewPlan(p,pythonCurriculum).some(t=>t.id==='variables')})()")
    Check 'A corrected lesson clears an older quiz weakness' (Eval "(()=>{const p={version:1,lessons:[],tasks:[],checks:{variables:{correct:true,checkedAt:'2026-01-02T00:00:00Z'}},assessments:{'1':{score:100,answers:[0,2,1,1],submittedAt:'2026-01-01T00:00:00Z'}}};return !learningSupport.reviewPlan(p,pythonCurriculum).some(t=>t.id==='variables')})()")
    Check 'Locked advanced lessons are excluded from recommendations' (Eval "learningSupport.reviewPlan({version:1,lessons:[],tasks:[],assessments:{},checks:{functions:{correct:false}}},pythonCurriculum).length===0")
    foreach($task in @('student-profile','receipt','grade-checker','sum-numbers','list-summary','task-manager')){
      Go ('pages/student/workspace.html?task='+$task)
      Eval "document.getElementById('code-editor').value=learningSupport.tasks[new URLSearchParams(location.search).get('task')].solution;document.getElementById('submit-code').click();true"|Out-Null
      WaitRun|Out-Null
      Check ('Prepared reference solution passes real Python checks: '+$task) (Eval "JSON.parse(cmStorage.getItem('codementor-demo-learning')).tasks.includes(new URLSearchParams(location.search).get('task'))")
    }
    Go 'pages/student/dashboard.html'
    Check 'Successful retries remove review items from the rendered dashboard' (Eval "document.querySelectorAll('.review-plan-item').length===0")
    Go 'pages/student/workspace.html?task=task-manager'
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}|Out-Null
    Eval "document.getElementById('reveal-hint').click();document.getElementById('reveal-solution').click();true"|Out-Null
    Check 'Hints and expanded solution fit a phone viewport' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/learning-support-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}