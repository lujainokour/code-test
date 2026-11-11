# Student pages visual pass: before/after screenshots and layout checks.
#   -Phase before            screenshots only (1440 and 390) for -Pages
#   -Phase after             screenshots + checks: student-ui opt-in, no horizontal scroll at
#                            1440/1024/768/390, visible buttons >= 44px tall at 390, no JS errors
#   -Pages a,b,c             page keys (default: all 25 student pages)
param([ValidateSet('before','after')][string]$Phase = 'after', [string[]]$Pages = @())
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$out = Join-Path $root 'docs/evidence/student-pages'
New-Item -ItemType Directory -Force $out | Out-Null
$routes = [ordered]@{
    'learning-path'='learning-path.html'; 'module'='module.html?level=1'; 'lesson'='lesson.html?lesson=variables'; 'level-assessment'='level-assessment.html?level=1'
    'practice'='practice.html'; 'workspace'='workspace.html?task=receipt'; 'code-review'='code-review.html?task=student-profile'
    'placement-intro'='placement-intro.html'; 'placement-question'='placement-question.html'; 'placement-review'='placement-review.html'; 'placement-results'='placement-results.html'
    'skill-analysis'='skill-analysis.html'; 'learning-report'='learning-report.html'
    'profile'='profile.html'; 'onboarding'='onboarding.html'; 'subscription'='subscription.html'; 'career'='career.html'; 'virtual-internship'='virtual-internship.html'
    'requests'='requests.html'; 'messages'='messages.html'; 'local-portfolio'='local-portfolio.html'; 'mentor'='mentor.html'; 'mentor-studio'='mentor-studio.html'
    'project'='project.html'; 'project-evaluation'='project-evaluation.html'
}
# powershell -File passes a comma list as one string: split it.
$Pages = @($Pages | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (!$Pages.Count) { $Pages = @($routes.Keys) }
$unknown = @($Pages | Where-Object { !$routes.Contains($_) }); if ($unknown.Count) { throw ('Unknown pages: ' + ($unknown -join ', ')) }
$profile = Join-Path $env:TEMP ('cm-student-pages-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8881') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null; $failures = @(); $passes = 0
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8881/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($i=0; $i -lt 80 -and !(Test-Path $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0; $script:errors = @()
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $r=$socket.Receive()|ConvertFrom-Json; if ($r.method -eq 'Runtime.exceptionThrown') { $script:errors += ($script:current + ': ' + $r.params.exceptionDetails.exception.description) } } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $script:current = $p; $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8881/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1200; Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 200 }
    function Shot($n) { $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=70;captureBeyondViewport=$true}; [IO.File]::WriteAllBytes((Join-Path $out "$n.jpg"),[Convert]::FromBase64String($s.data)) }
    function Check($name,$ok) { if ($ok) { $script:passes++; Write-Output "PASS $name" } else { $script:failures += $name; Write-Output "FAIL $name" } }
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440
    Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 900
    # Real-shaped saved progress: Level 1 lessons, one passed task, a failing run, a quiz and lesson checks.
    Open 'index.html'
    Eval "(()=>{const d=n=>new Date(Date.now()-n*86400000).toISOString();cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types','input-output','numbers'],tasks:['student-profile'],assessments:{'1':{score:75,lastScore:75,submittedAt:d(1)}},checks:{variables:{correct:true,answer:0,checkedAt:d(3)},'data-types':{correct:false,answer:1,checkedAt:d(2)}},taskResults:{'student-profile':{passed:3,total:3,code:'age = 20\nprint(age)',cases:[1,2,3].map(n=>({passed:true,input:'',expected:'20',output:'20',error:''})),submittedAt:d(1)},receipt:{passed:1,total:3,cases:[{passed:false,input:'',expected:'Total: 5',output:'Total: 4',error:''}],submittedAt:d(0)}}}));cmStorage.setItem('codementor-demo-code-student-profile',JSON.stringify({version:1,taskId:'student-profile',code:'age = 20\nprint(age)',savedAt:d(1)}));return true})()" | Out-Null
    # Placement: an in-progress attempt for the question page, submitted afterwards for review/results.
    Open 'pages/student/placement-intro.html'
    Eval "(()=>{const s=placementStore;let a=s.begin(s.capture());a=s.save({answers:s.bank().questions.map((q,i)=>i<3?q.correct:null),currentQuestion:3},JSON.stringify(a),s.capture());return true})()" | Out-Null
    $placementSubmitted = $false
    foreach ($key in $routes.Keys) {
        if ($Pages -notcontains $key) { continue }
        if (!$placementSubmitted -and @('placement-review','placement-results','skill-analysis') -contains $key) {
            Open 'pages/student/placement-intro.html'
            Eval "(()=>{const s=placementStore;const a=s.read();const filled=s.save({answers:s.bank().questions.map(q=>q.correct),currentQuestion:s.bank().questions.length-1},JSON.stringify(a),s.capture());s.submit(JSON.stringify(filled),s.capture());return true})()" | Out-Null
            $placementSubmitted = $true
        }
        $path = 'pages/student/' + $routes[$key]
        foreach ($w in @(1440, 390)) { Size $w; Open $path; Shot "$key-$Phase-$w" }
        if ($Phase -eq 'after') {
            Size 1440; Open $path
            Check "$key opts in to the shared student UI" (Eval "document.body.classList.contains('student-ui')")
            foreach ($w in @(1440, 1024, 768, 390)) { Size $w; Check "$key $w px has no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth+1') }
            Check "$key visible buttons are at least 44px tall at 390 px" (Eval "[...document.querySelectorAll('main .button')].filter(b=>b.offsetParent!==null&&b.getBoundingClientRect().width>0).every(b=>b.getBoundingClientRect().height>=43.5)")
        }
    }
    if ($Phase -eq 'after') { Check 'No uncaught JavaScript exceptions on these pages' ($script:errors.Count -eq 0) }
    if ($script:errors.Count) { Write-Output ('JS errors: ' + ($script:errors -join ' || ')) }
    Write-Output "SUMMARY passed=$passes failed=$($failures.Count)"
    if ($failures.Count) { throw ('Failed: ' + ($failures -join '; ')) }
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
