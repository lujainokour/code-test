param([string]$BaseUrl = "http://127.0.0.1:8897/")
$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-popup-blocking','--no-proxy-server','"--host-resolver-rules=MAP kahoot.it 127.0.0.1"','--no-sandbox','--disable-software-rasterizer','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
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
    function Go($path){Cdp 'Page.navigate' @{url=($BaseUrl+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    function Snapshot { Eval "JSON.stringify({local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)]))})" }
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Challenge Test',email:'kahoot-isolated@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/module.html?level=1'
    $baseline=Snapshot
    Check 'Level 01 has exact challenge title and description' (Eval "document.getElementById('level-challenge-title').textContent==='Level 01 Challenge'&&document.getElementById('level-challenge-description').textContent==='Review what you learned with an optional Kahoot! challenge.'")
    Check 'Missing assignment shows coming soon with no clickable control' (Eval "!document.getElementById('level-challenge').hidden&&document.getElementById('level-challenge-actions').textContent==='Challenge coming soon'&&!document.querySelector('#level-challenge-actions a, #level-challenge-actions button')")
    Check 'Challenge does not change locked assessment prerequisites' (Eval "document.getElementById('assessment-link').hidden&&!document.getElementById('assessment-locked').hidden")
    Check 'No iframe or completion checkbox is present' (Eval "!document.querySelector('#level-challenge iframe, #level-challenge input, #level-challenge button')")
    Check 'Unsafe, generic, and lookalike URLs are rejected' (Eval "['http://kahoot.it/challenge/test','https://kahoot.it','https://kahoot.com/','https://kahoot.it.evil.example/challenge/test','https://kahoot-it.example/challenge/test','https://evil.example/?url=https://kahoot.it/challenge/test','https://kahoot.it@evil.example/challenge/test','https://user:pass@kahoot.it/challenge/test','javascript:alert(1)','https://kahoot.it:444/challenge/test','https://create.kahoot.it/share/example','https://kahoot.it/challenge/'].every(value=>levelChallenges.assignmentUrl(value)===null)")
    Eval "window.originalChallenges=levelChallenges;window.levelChallenges={...originalChallenges,get:(language,id)=>{const value=originalChallenges.get(language,id);return value?{...value,assignmentUrl:'https://kahoot.it/challenge/isolated-assignment-test-only'}:null}};dispatchEvent(new Event('pageshow'));true"|Out-Null
    Check 'Isolated HTTPS Assignment renders the real action label' (Eval "document.querySelector('#level-challenge-actions a').textContent==='Play on Kahoot!'")
    Check 'Assignment opens a new tab with noopener and noreferrer' (Eval "(()=>{const a=document.querySelector('#level-challenge-actions a');return a.target==='_blank'&&a.relList.contains('noopener')&&a.relList.contains('noreferrer')})()")
    Cdp 'Runtime.evaluate' @{expression="document.querySelector('#level-challenge-actions a').click()";userGesture=$true;returnByValue=$true}|Out-Null
    Start-Sleep -Milliseconds 300
    $targets=(Cdp 'Target.getTargets' @{}).targetInfos
    $popup=$targets|Where-Object {$_.type -eq 'page' -and $_.url -like 'https://kahoot.it/challenge/*'}|Select-Object -First 1
    Check 'Click actually creates a separate assignment tab (host isolated to loopback)' ([bool]$popup)
    if($popup){
      $attach=Cdp 'Target.attachToTarget' @{targetId=$popup.targetId;flatten=$true}
      $script:sequence++;$id=$script:sequence
      $socket.Send((@{id=$id;sessionId=$attach.sessionId;method='Runtime.evaluate';params=@{expression="window.opener===null&&document.referrer===''";returnByValue=$true}}|ConvertTo-Json -Depth 8 -Compress))
      do{$r=$socket.Receive()|ConvertFrom-Json}while($r.id -ne $id)
      Check 'Opened tab has no opener or referrer' ($r.result.result.value -eq $true)
      Cdp 'Target.closeTarget' @{targetId=$popup.targetId}|Out-Null
    }
    Check 'Rendering and clicking do not change any stored records' ((Snapshot) -eq $baseline)
    Check 'Click does not unlock assessment or display a completion state' (Eval "document.getElementById('assessment-link').hidden&&document.getElementById('level-challenge-actions').textContent==='Play on Kahoot!'")
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}|Out-Null
    Eval "document.getElementById('level-challenge').scrollIntoView();true"|Out-Null
    Check 'Active challenge fits phone viewport' (Eval "document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#level-challenge-actions a').getBoundingClientRect().width<=document.getElementById('level-challenge').getBoundingClientRect().width")
    Eval "window.levelChallenges=originalChallenges;dispatchEvent(new Event('pageshow'));true"|Out-Null
    Check 'Missing challenge also fits phone viewport' (Eval "document.documentElement.scrollWidth<=innerWidth&&!document.querySelector('#level-challenge-actions a')")
    Check 'Responsive checks leave progress unchanged' ((Snapshot) -eq $baseline)
    Eval "let p=pythonCurriculum.read();p.lessons=pythonCurriculum.levels[0].lessons.map(l=>l.id);cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));dispatchEvent(new Event('pageshow'));true"|Out-Null
    Check 'Completing lessons unlocks quiz without playing the challenge' (Eval "!document.getElementById('assessment-link').hidden")
    Go 'pages/student/level-assessment.html?level=1'
    Check 'Level quiz remains independent of challenge configuration' (Eval "!document.getElementById('level-assessment-form').hidden&&!document.getElementById('level-challenge')")
    Eval "let p=pythonCurriculum.read();p.assessments['1']={score:75};cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true"|Out-Null
    Go 'pages/student/module.html?level=2'
    Check 'No challenge card is exposed for unconfigured Level 02' (Eval "document.getElementById('level-challenge').hidden")
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/kahoot-challenge-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}