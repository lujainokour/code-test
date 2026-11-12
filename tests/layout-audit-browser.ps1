# Layout audit + glass check across every page and role at 1440 / 1024 / 768 / 390 px.
#   -Phase before|after   output folder docs/evidence/layout-audit/<phase>/ (screenshots at 1440 and 390, results.json)
#   -Only a,b,c           optional page-path filter (substring match) for a smaller run
# Roles and states: guest; new student (no data); student with progress + community SAMPLE data and a
# Python group membership; admin (sample company loaded); company (sample company account).
# Measurement only: tools/layout-audit.js is injected and never changes the page.
param([ValidateSet('before','after')][string]$Phase = 'before', [string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$out = Join-Path $root "docs/evidence/layout-audit/$Phase"; New-Item -ItemType Directory -Force $out | Out-Null
$Only = @($Only | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$auditJs = Get-Content (Join-Path $root 'tools/layout-audit.js') -Raw
$profile = Join-Path $env:TEMP ('cm-layout-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8884') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8884/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($i=0; $i -lt 80 -and !(Test-Path $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0; $script:events = @{}; $script:current = 'setup'
    function Note($text) { if (!$script:events.ContainsKey($script:current)) { $script:events[$script:current] = New-Object System.Collections.ArrayList }; [void]$script:events[$script:current].Add($text) }
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do {
            $r = $socket.Receive() | ConvertFrom-Json
            if ($r.method -eq 'Runtime.exceptionThrown') { Note ('exception: ' + $r.params.exceptionDetails.exception.description) }
            elseif ($r.method -eq 'Log.entryAdded' -and $r.params.entry.level -eq 'error') { Note ('log: ' + $r.params.entry.text + ' ' + $r.params.entry.url) }
        } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8884/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1300; Eval "(()=>{document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();return true})()" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    function Shot($file) {
        $w = [int](Eval 'innerWidth'); $h = [int](Eval 'Math.min(Math.max(document.documentElement.scrollHeight, innerHeight), 7000)')
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=$h;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 300
        $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=50}
        [IO.File]::WriteAllBytes($file,[Convert]::FromBase64String($s.data))
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 150
    }
    $glassJs = @'
(()=>{const b=document.body,g=b.classList.contains('glass-ui');if(!g)return JSON.stringify({glass:false});
const cs=e=>e?getComputedStyle(e):null,side=document.querySelector('.workspace-sidebar'),top=document.querySelector('.workspace-topbar');
const bf=e=>{const s=cs(e);return s?(s.backdropFilter||s.webkitBackdropFilter||'none'):null};
const alpha=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(',');return p.length>3?parseFloat(p[3]):1};
const solid=[...document.querySelectorAll('.community-code pre, pre.question-code, textarea.code-editor, #learning-report, table')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({el:e.tagName.toLowerCase()+(e.id?'#'+e.id:''),alpha:alpha(cs(e).backgroundColor),blur:bf(e)}));
return JSON.stringify({glass:true,backdrop:/gradient/.test(getComputedStyle(b,'::before').backgroundImage),sidebarBlur:side?bf(side):null,sidebarBg:side?cs(side).backgroundColor:null,navColor:side?cs(side.querySelector('.workspace-navigation a')||side).color:null,topbarBlur:top?bf(top):null,solid})})()
'@
    $results = New-Object System.Collections.ArrayList
    function Audit($role, $path) {
        if ($Only.Count -and !($Only | Where-Object { $path -like "*$_*" })) { return }
        $script:current = "$role $path"
        $slug = ($role + '-' + ($path -replace '\?.*$','' -replace '\.html$','' -replace '[/]','-'))
        Size 1440; Open $path
        Eval ($auditJs + ';true') | Out-Null
        $entry = [ordered]@{ role=$role; page=$path; url=(Eval "location.pathname.replace(/^\//,'')+location.search"); glass=(Eval $glassJs | ConvertFrom-Json); widths=[ordered]@{} }
        foreach ($w in @(1440, 1024, 768, 390)) {
            if ($w -ne 1440) { Size $w }
            $m = Eval "JSON.stringify({...layoutAudit.run(),overflow:document.documentElement.scrollWidth>innerWidth+1,scrollHeight:document.documentElement.scrollHeight})" | ConvertFrom-Json
            $entry.widths["$w"] = $m
            if ($w -eq 1440 -or $w -eq 390) { Shot (Join-Path $out "$slug-$w.jpg") }
        }
        [void]$results.Add($entry); Write-Output ("audited {0,-9} {1} issues@1440={2}" -f $role, $path, @($entry.widths['1440'].issues).Count)
    }
    $names = { param($dir) Get-ChildItem (Join-Path $root $dir) -Filter *.html | Sort-Object Name | ForEach-Object { "$dir/$($_.Name)" } }
    $routes = @{ 'module.html'='module.html?level=1'; 'lesson.html'='lesson.html?lesson=variables'; 'level-assessment.html'='level-assessment.html?level=1'; 'workspace.html'='workspace.html?task=receipt'; 'code-review.html'='code-review.html?task=student-profile' }
    $studentPages = @(& $names 'pages/student') | ForEach-Object { $f = Split-Path $_ -Leaf; if ($routes.ContainsKey($f)) { 'pages/student/' + $routes[$f] } else { $_ } }
    Cdp 'Runtime.enable' @{} | Out-Null; Cdp 'Log.enable' @{} | Out-Null
    Size 1440; Open 'index.html'; Eval '(()=>{localStorage.clear();sessionStorage.clear();return true})()' | Out-Null
    # Guest: public and auth pages.
    foreach ($p in @('index.html') + (& $names 'pages/public') + (& $names 'pages/auth')) { Audit 'guest' $p }
    # New student: no saved data at all.
    $script:current = 'new student sign-in'
    Open 'pages/auth/login.html'
    Eval "(()=>{document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();return true})()" | Out-Null
    Start-Sleep -Milliseconds 1300
    foreach ($p in $studentPages + (& $names 'pages/services')) { Audit 'new' $p }
    # Student with progress, a submitted placement, community SAMPLE data and Python group membership (test seeding).
    $script:current = 'seed progress'
    Open 'index.html'
    Eval "(()=>{const d=n=>new Date(Date.now()-n*86400000).toISOString();cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types','input-output','numbers'],tasks:['student-profile'],assessments:{'1':{score:75,lastScore:75,submittedAt:d(1)}},checks:{variables:{correct:true,answer:0,checkedAt:d(3)}},taskResults:{'student-profile':{passed:3,total:3,cases:[],submittedAt:d(1)}}}));return true})()" | Out-Null
    Open 'pages/services/community.html'
    Eval "(async()=>{sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()}));await communityStore.loadSample();await communityMembership.request('python','Learning Python with the group.');const r=communityMembership.requests().find(x=>x.channel==='python'&&x.status==='pending'&&!x.sample);await communityMembership.decide(r.id,'approved','Welcome');sessionStorage.removeItem('codementor-admin-session');return true})()" | Out-Null
    Open 'pages/student/placement-intro.html'
    Eval "(()=>{const s=placementStore;let a=s.begin(s.capture());a=s.save({answers:s.bank().questions.map(q=>q.correct),currentQuestion:s.bank().questions.length-1},JSON.stringify(a),s.capture());s.submit(JSON.stringify(a),s.capture());return true})()" | Out-Null
    foreach ($p in $studentPages + @('pages/services/community.html')) { Audit 'progress' $p }
    # Admin (and the sample company for the company pages).
    $script:current = 'admin sign-in'
    Open 'index.html'; Eval '(()=>{localStorage.clear();sessionStorage.clear();return true})()' | Out-Null
    Open 'pages/auth/admin-login.html'
    Eval "(()=>{document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();return true})()" | Out-Null
    Start-Sleep -Milliseconds 1300
    Open 'pages/admin/admin-companies.html'
    Eval "(()=>{document.getElementById('sample-company-load')?.click();return true})()" | Out-Null
    Start-Sleep -Milliseconds 600
    foreach ($p in (& $names 'pages/admin')) { Audit 'admin' $p }
    # Company (sample company account).
    $script:current = 'company sign-in'
    Open 'pages/auth/company-login.html'
    Eval "(()=>{document.getElementById('fill-company-demo').click();document.getElementById('company-login-form').requestSubmit();return true})()" | Out-Null
    Start-Sleep -Milliseconds 2500
    foreach ($p in (& $names 'pages/company')) { Audit 'company' $p }
    $script:current = 'end'; Eval 'true' | Out-Null
    $report = [ordered]@{ phase=$Phase; generated=(Get-Date).ToString('s'); results=$results; events=$script:events }
    [IO.File]::WriteAllText((Join-Path $out 'results.json'), ($report | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
    Write-Output "AUDIT DONE pages=$($results.Count)"
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
