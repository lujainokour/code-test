# QA sweep: every page of every role at 1440 / 1024 / 768 / 390 px.
# Records layout metrics, console errors, failed resources and JS exceptions to
# docs/evidence/qa-sweep/results.json and saves full-page screenshots at 1440 and 390.
# Student pages are also saved as docs/evidence/student-pages/<key>-after-<w>.jpg.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tests/qa-sweep-browser.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$out = Join-Path $root 'docs/evidence/qa-sweep'; New-Item -ItemType Directory -Force $out | Out-Null
$studentOut = Join-Path $root 'docs/evidence/student-pages'
$names = { param($dir) Get-ChildItem (Join-Path $root $dir) -Filter *.html | Sort-Object Name | ForEach-Object { "$dir/$($_.Name)" } }
$studentRoutes = @{ 'module.html'='module.html?level=1'; 'lesson.html'='lesson.html?lesson=variables'; 'level-assessment.html'='level-assessment.html?level=1'; 'workspace.html'='workspace.html?task=receipt'; 'code-review.html'='code-review.html?task=student-profile' }
$studentKeys = (Get-Content (Join-Path $root 'docs/evidence/student-pages/opted-in.json') -Raw | ConvertFrom-Json).pages
$profile = Join-Path $env:TEMP ('cm-qa-sweep-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8882') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
$metricsJs = @'
(()=>{const W=innerWidth;const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'};
const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
const wide=[...document.querySelectorAll('body *')].filter(e=>{if(e.closest('[hidden],dialog:not([open])'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>W+1&&getComputedStyle(e).position!=='fixed'});
const outer=wide.filter(e=>!wide.includes(e.parentElement)).slice(0,4).map(name);
const small=W<600?[...document.querySelectorAll('main .button, main button, main select, main input:not([type=checkbox]):not([type=radio]):not([type=hidden])')].filter(vis).filter(b=>b.getBoundingClientRect().height<43.5).slice(0,6).map(b=>name(b)+'='+Math.round(b.getBoundingClientRect().height)):[];
const imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&vis(i)).map(i=>i.getAttribute('src')).slice(0,4);
const vids=[...document.querySelectorAll('video')].filter(v=>v.error).map(v=>v.currentSrc).slice(0,3);
const clipped=[...document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main label, main li, main td')].filter(vis).filter(e=>{const s=getComputedStyle(e);return e.scrollWidth>e.clientWidth+2&&s.overflowX!=='visible'&&s.textOverflow!=='ellipsis'}).slice(0,4).map(name);
const errs=[...document.querySelectorAll('.form-message.is-error, [role=status].is-error, [role=alert]')].filter(vis).map(e=>e.textContent.trim()).filter(Boolean).slice(0,3);
const m=document.querySelector('main');
return JSON.stringify({over:document.documentElement.scrollWidth>W+1,scrollWidth:document.documentElement.scrollWidth,outer,small,imgs,vids,clipped,errs,sheets:document.styleSheets.length,font:getComputedStyle(document.body).fontFamily.slice(0,40),mainText:(m||document.body).innerText.trim().length,hasMain:!!m,url:location.pathname.replace(/^\//,'')+location.search,title:document.title,favicon:!!document.querySelector('link[rel~=icon]'),h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,shell:document.body.classList.contains('shell-active'),studentUi:document.body.classList.contains('student-ui')})})()
'@
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8882/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
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
            if ($r.method -eq 'Runtime.exceptionThrown') { Note ('exception: ' + $r.params.exceptionDetails.exception.description + ' ' + $r.params.exceptionDetails.text) }
            elseif ($r.method -eq 'Runtime.consoleAPICalled' -and $r.params.type -eq 'error') { Note ('console.error: ' + (($r.params.args | ForEach-Object { if ($_.value) { $_.value } else { $_.description } }) -join ' ')) }
            elseif ($r.method -eq 'Log.entryAdded' -and $r.params.entry.level -eq 'error') { Note ('log: ' + $r.params.entry.text + ' ' + $r.params.entry.url) }
        } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8882/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1300; Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    function Shot($file) { $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=55;captureBeyondViewport=$true}; [IO.File]::WriteAllBytes($file,[Convert]::FromBase64String($s.data)) }
    Cdp 'Runtime.enable' @{} | Out-Null; Cdp 'Log.enable' @{} | Out-Null; Cdp 'Page.enable' @{} | Out-Null
    $results = New-Object System.Collections.ArrayList
    function Sweep($role, $path) {
        $script:current = "$role $path"
        $slug = ($role + '-' + ($path -replace '\?.*$','' -replace '\.html$','' -replace '[/]','-'))
        Size 1440; Open $path
        $entry = [ordered]@{ role=$role; page=$path; widths=[ordered]@{} }
        foreach ($w in @(1440, 1024, 768, 390)) {
            if ($w -ne 1440) { Size $w }
            $entry.widths["$w"] = (Eval $metricsJs | ConvertFrom-Json)
            if ($w -eq 1440 -or $w -eq 390) {
                Shot (Join-Path $out "$slug-$w.jpg")
                $key = [IO.Path]::GetFileNameWithoutExtension(($path -replace '\?.*$',''))
                if ($role -eq 'student' -and $path -like 'pages/student/*' -and $studentKeys -contains $key) { Copy-Item (Join-Path $out "$slug-$w.jpg") (Join-Path $studentOut "$key-after-$w.jpg") -Force }
            }
        }
        [void]$results.Add($entry); Write-Output ("swept {0,-8} {1}" -f $role, $path)
    }
    function SignIn($loginPage, $fill, $form) {
        Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
        Open $loginPage
        Eval "document.getElementById('$fill').click();document.getElementById('$form').requestSubmit();true" | Out-Null
        Start-Sleep -Milliseconds 1200
    }
    # Guest
    Size 1440; Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    foreach ($p in @('index.html','dashboard.html','company-dashboard.html','teacher-dashboard.html') + (& $names 'pages/public') + (& $names 'pages/auth') + (& $names 'pages/services')) { Sweep 'guest' $p }
    # Student, with real-shaped saved progress (same seed as tests/student-pages-browser.ps1)
    $script:current = 'student sign-in'
    SignIn 'pages/auth/login.html' 'fill-demo' 'login-form'
    Open 'index.html'
    Eval "(()=>{const d=n=>new Date(Date.now()-n*86400000).toISOString();cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types','input-output','numbers'],tasks:['student-profile'],assessments:{'1':{score:75,lastScore:75,submittedAt:d(1)}},checks:{variables:{correct:true,answer:0,checkedAt:d(3)},'data-types':{correct:false,answer:1,checkedAt:d(2)}},taskResults:{'student-profile':{passed:3,total:3,code:'age = 20\nprint(age)',cases:[1,2,3].map(n=>({passed:true,input:'',expected:'20',output:'20',error:''})),submittedAt:d(1)},receipt:{passed:1,total:3,cases:[{passed:false,input:'',expected:'Total: 5',output:'Total: 4',error:''}],submittedAt:d(0)}}}));cmStorage.setItem('codementor-demo-code-student-profile',JSON.stringify({version:1,taskId:'student-profile',code:'age = 20\nprint(age)',savedAt:d(1)}));return true})()" | Out-Null
    Open 'pages/student/placement-intro.html'
    Eval "(()=>{const s=placementStore;let a=s.begin(s.capture());a=s.save({answers:s.bank().questions.map((q,i)=>i<3?q.correct:null),currentQuestion:3},JSON.stringify(a),s.capture());return true})()" | Out-Null
    $studentPages = @(& $names 'pages/student') | ForEach-Object { $f = Split-Path $_ -Leaf; if ($studentRoutes.ContainsKey($f)) { 'pages/student/' + $studentRoutes[$f] } else { $_ } }
    $first = @('pages/student/placement-intro.html','pages/student/placement-question.html')
    foreach ($p in $first) { Sweep 'student' $p }
    $script:current = 'student placement fill'
    Eval "(()=>{const s=placementStore;const a=s.read();s.save({answers:s.bank().questions.map(q=>q.correct),currentQuestion:s.bank().questions.length-1},JSON.stringify(a),s.capture());return true})()" | Out-Null
    Sweep 'student' 'pages/student/placement-review.html'
    $script:current = 'student placement submit'
    Eval "(()=>{const s=placementStore;const a=s.read();s.submit(JSON.stringify(a),s.capture());return true})()" | Out-Null
    foreach ($p in $studentPages) { if ($first -notcontains $p -and $p -ne 'pages/student/placement-review.html') { Sweep 'student' $p } }
    foreach ($p in @('dashboard.html') + (& $names 'pages/services')) { Sweep 'student' $p }
    # Admin (teacher pages redirect to administration)
    $script:current = 'admin sign-in'
    SignIn 'pages/auth/admin-login.html' 'fill-demo' 'login-form'
    foreach ($p in (& $names 'pages/admin') + (& $names 'pages/teacher')) { Sweep 'admin' $p }
    # Company
    $script:current = 'company sign-in'
    SignIn 'pages/auth/company-login.html' 'fill-company-demo' 'company-login-form'
    foreach ($p in @('company-dashboard.html') + (& $names 'pages/company')) { Sweep 'company' $p }
    $script:current = 'end'; Eval 'true' | Out-Null
    $report = [ordered]@{ generated=(Get-Date).ToString('s'); results=$results; events=$script:events }
    [IO.File]::WriteAllText((Join-Path $out 'results.json'), ($report | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    Write-Output "SWEEP DONE pages=$($results.Count) eventsPages=$($script:events.Count)"
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
