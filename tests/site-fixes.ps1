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
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=('http://127.0.0.1:8903/'+$path)}|Out-Null;Start-Sleep -Milliseconds 450}
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Audit Tester',email:'audit-fixes@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/progress.html'
    Go 'pages/student/workspace.html?task=receipt'
    Eval "document.getElementById('code-editor').value=learningSupport.tasks.receipt.solution;document.getElementById('submit-code').click();true" | Out-Null
    Eval "new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{if(!document.getElementById('submit-code').disabled){clearInterval(timer);resolve(true)}else if(Date.now()-start>110000){clearInterval(timer);reject(new Error('Python execution timed out'))}},100)})" | Out-Null
    Go 'pages/student/workspace.html?task=receipt'
    Check 'Restored submission can be downloaded from workspace' (Eval "!document.getElementById('submission-completion').hidden&&!document.getElementById('download-submission').disabled")
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8903/pages/student/project-evaluation.html'} | Out-Null
    Start-Sleep -Milliseconds 400
    Check 'Old project evaluation route now opens real project test results' (Eval "location.pathname.endsWith('/code-review.html')&&new URLSearchParams(location.search).get('task')==='task-manager'")
    Check 'No uncaught JavaScript errors' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/site-fixes-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}
