# Delight layer in a real browser: checklist, celebration once, Undo, unlock toast, admin polish,
# certificates, reduced motion. Screenshots go to docs/evidence/delight-*.png.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$evidence = Join-Path $root 'docs/evidence'
$profile = Join-Path $env:TEMP ('cm-delight-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8878') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8878/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($i=0; $i -lt 80 -and !(Test-Path $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0; $script:errors = @()
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $r=$socket.Receive()|ConvertFrom-Json; if ($r.method -eq 'Runtime.exceptionThrown') { $script:errors += $r.params.exceptionDetails.exception.description } } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8878/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1100 }
    function Check($name,$ok) { if (!$ok) {throw "FAIL $name"}; Write-Output "PASS $name" }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    function Shot($n) { $s=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}; [IO.File]::WriteAllBytes((Join-Path $evidence "$n.png"),[Convert]::FromBase64String($s.data)) }
    function Skip { Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 900
    Eval "cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables'],tasks:[],assessments:{}}));true" | Out-Null
    # 1. Checklist from real state
    Open 'pages/student/dashboard.html'; Skip
    Check 'Checklist shows six steps with lesson done and the first run as current' (Eval "document.querySelectorAll('#getting-started .sp-step').length===6 && document.querySelector('[data-step=lesson]').dataset.state==='done' && document.querySelector('[data-step=run]').dataset.state==='current'")
    Check 'Exactly one Continue on the dashboard with the checklist' (Eval "[...document.querySelectorAll('main a, main button')].filter(n=>/^\s*continue\b/i.test(n.textContent)&&n.offsetParent!==null).length===1")
    Shot 'delight-dashboard-checklist-1440'
    # 2. Unlock toast: first visit recorded silently; a new passed task announces once.
    # Write test data from a neutral page: an open dashboard would react live to the save.
    Open 'index.html'
    Eval "cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables'],tasks:['student-profile'],assessments:{},taskResults:{'student-profile':{passed:3,total:3,cases:[],submittedAt:new Date().toISOString()}}}));true" | Out-Null
    Open 'pages/student/dashboard.html'; Skip
    Check 'A newly passed task shows one unlock toast' (Eval "document.getElementById('ik-toasts')?.textContent.includes('Badge unlocked: First passing code')")
    Open 'pages/student/progress.html'; Skip
    Check 'My progress shines the new badge once and does not toast again' (Eval "document.querySelector('[data-achievement=first-task]').classList.contains('ik-shine') && !document.getElementById('ik-toasts')")
    Open 'pages/student/progress.html'; Skip
    Check 'The shine never replays' (Eval "!document.querySelector('[data-achievement=first-task]').classList.contains('ik-shine')")
    # 3. Community Undo on a real post
    Eval "localStorage.setItem('codementor-community-memberships-v1',JSON.stringify({version:1,requests:[{id:'m1',channel:'python',owner:'student@example.com',name:'Demo Student (SAMPLE)',reason:'Learning Python',status:'approved',updatedAt:new Date().toISOString()}]}));true" | Out-Null
    Open 'pages/services/community.html'; Skip
    Eval "communityStore.createPost({channel:'python',title:'Browser undo check',body:'Delete then restore me'},'student@example.com').then(()=>dispatchEvent(new Event('community-changed'))).then(()=>true)" | Out-Null
    Start-Sleep -Milliseconds 400
    Eval "[...document.querySelectorAll('.community-post')].find(p=>p.textContent.includes('Browser undo check')).querySelector('.community-delete').click();true" | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Deleting your own post offers Undo in an aria-live toast' (Eval "!localStorage.getItem('codementor-community-v1').includes('Browser undo check') && document.getElementById('ik-toasts').getAttribute('aria-live')==='polite' && [...document.querySelectorAll('#ik-toasts button')].some(b=>b.textContent==='Undo')")
    Eval "[...document.querySelectorAll('#ik-toasts button')].find(b=>b.textContent==='Undo').click();true" | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Undo restores the post' (Eval "localStorage.getItem('codementor-community-v1').includes('Browser undo check') && [...document.querySelectorAll('.community-post')].some(p=>p.textContent.includes('Browser undo check'))")
    # 4. Celebration once per account
    Open 'index.html'
    Eval "cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables'],tasks:['student-profile'],assessments:{},taskResults:{'student-profile':{passed:3,total:3,cases:[],submittedAt:new Date().toISOString()}}}));true" | Out-Null
    Open 'pages/student/dashboard.html'; Skip
    Check 'All steps done: celebration toast and once-per-account flag' (Eval "document.getElementById('ik-toasts')?.textContent.includes('Setup complete') && JSON.parse(localStorage.getItem('codementor-delight-v1:student%40example.com')).checklistCelebrated===true")
    Start-Sleep -Milliseconds 2000
    Check 'The checklist collapses into a compact Setup complete line' (Eval "document.getElementById('getting-started').dataset.state==='complete'")
    Open 'pages/student/dashboard.html'; Skip
    Check 'The celebration never replays' (Eval "!document.getElementById('ik-toasts') && document.getElementById('getting-started').dataset.state==='complete'")
    Size 390; Open 'pages/student/dashboard.html'; Skip
    Check 'Dashboard 390 px has no horizontal scroll' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Shot 'delight-dashboard-complete-390'
    Size 1440
    # 5. Reduced motion
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})} | Out-Null
    Open 'pages/student/dashboard.html'; Skip
    Check 'Reduced motion: no staggered entrance and final numbers at once' (Eval "!document.querySelector('.sp-kpis').classList.contains('ik-stagger') && document.getElementById('recorded-lessons').textContent.startsWith('1 / ')")
    Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='no-preference'})} | Out-Null
    # 6. Certificates locked state stays honest
    Open 'pages/student/certificates.html'; Skip
    Check 'Locked certificate is not animated' (Eval "document.body.classList.contains('certificate-locked') && !document.querySelector('.certificate-document').classList.contains('cm-printing')")
    # 7. Admin dashboard polish
    Eval "sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()}));true" | Out-Null
    Open 'pages/admin/admin-dashboard.html'; Skip
    Check 'Admin sidebar is grouped with one active link' (Eval "document.querySelectorAll('.admin-nav-group').length>=4 && document.querySelectorAll('.workspace-navigation a[aria-current=page]').length===1")
    Check 'Admin range tabs appear only with dated records' (Eval "(()=>{const tabs=document.querySelectorAll('.overview-range-tab').length;const dated=platformStore.getStudents().some(s=>s.createdAt);return dated?tabs===2:tabs===0})()")
    Check 'Admin dashboard 1440 px has no horizontal scroll' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Shot 'delight-admin-dashboard-1440'
    Check 'No uncaught JavaScript exceptions' ($script:errors.Count -eq 0)
} catch { if ($script:errors.Count) { Write-Output ('JS errors: ' + ($script:errors -join ' || ')) }; throw }
finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
