# QA sweep 2: re-checks only what was fixed after the first sweep (docs/QA-SWEEP.md).
#   company guard (guest redirect, sign-up, empty states, sign-out, return target after sign-in),
#   390 px touch targets, coding workspace toolbar, onboarding column, placement flow frame.
# Screenshots go to docs/evidence/qa-sweep-2/. Prints PASS/FAIL lines and a SUMMARY line.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$out = Join-Path $root 'docs/evidence/qa-sweep-2'; New-Item -ItemType Directory -Force $out | Out-Null
$profile = Join-Path $env:TEMP ('cm-qa-sweep-2-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8883') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null; $failures = @(); $passes = 0; $script:skips = @()
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8883/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($i=0; $i -lt 80 -and !(Test-Path $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0; $script:errors = @(); $script:current = 'setup'
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $r=$socket.Receive()|ConvertFrom-Json; if ($r.method -eq 'Runtime.exceptionThrown') { $script:errors += ($script:current + ': ' + $r.params.exceptionDetails.exception.description) } } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $script:current = $p; $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8883/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1300; Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    function Shot($n) { $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=60;captureBeyondViewport=$true}; [IO.File]::WriteAllBytes((Join-Path $out "$n.jpg"),[Convert]::FromBase64String($s.data)) }
    function Check($name,$ok) { if ($ok) { $script:passes++; Write-Output "PASS $name" } else { $script:failures += $name; Write-Output "FAIL $name" } }
    function Path() { return (Eval "location.pathname.replace(/^\//,'')+location.search") }
    # Every visible match of the selector is at least 44 px tall (and wide, when -Wide).
    function Tall($selector, $wide = $false) { return (Eval "(()=>{const v=[...document.querySelectorAll('$selector')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});if(!v.length)return -1;return v.every(e=>{const r=e.getBoundingClientRect();return r.height>=43.5&&(!$($wide.ToString().ToLower())||r.width>=43.5)})?1:0})()") }
    function Target($name, $selector, $wide = $false) { $r = Tall $selector $wide; if ($r -eq -1) { $script:skips += $name; Write-Output "SKIP $name (not visible in this state)" } else { Check $name ($r -eq 1) } }
    # The main card sits clear of the sidebar (1440) or the screen edges (390).
    function Framed($selector) { return (Eval "(()=>{const c=document.querySelector('$selector');if(!c)return false;const r=c.getBoundingClientRect();const s=document.querySelector('.workspace-sidebar');const left=innerWidth>=1101&&s?s.getBoundingClientRect().right+16:12;return r.left>=left&&r.right<=innerWidth-12})()") }
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440; Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null

    # 1. Company guard: guest is sent to company sign-in with a return target.
    Open 'pages/company/company-jobs.html'
    Check 'Guest opening a company page is sent to company sign-in with ?next=' ((Path) -eq 'pages/auth/company-login.html?next=pages%2Fcompany%2Fcompany-jobs.html')
    Shot 'company-guest-redirect-1440'
    Open 'company-dashboard.html'
    Check 'Guest opening the root company dashboard link is sent to company sign-in' ((Path) -like 'pages/auth/company-login.html?next=pages%2Fcompany%2Fcompany-dashboard.html*')
    # Register a fresh local test company in this throwaway browser profile (empty workspace).
    Open 'pages/auth/company-signup.html'
    Eval "(()=>{const v=(id,x)=>{const e=document.getElementById(id);e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}))};v('company-name','QA Test Company (SAMPLE)');v('industry','Software');v('email','qa-company@example.com');v('location','Remote');v('website','https://qa.example');v('password','QaCompanyPass123!');document.getElementById('size').selectedIndex=1;document.getElementById('company-signup-form').requestSubmit();return true})()" | Out-Null
    Start-Sleep -Milliseconds 4500
    $script:current = 'company dashboard'
    Check 'A signed-in company opens the company dashboard' ((Path) -eq 'pages/company/company-dashboard.html')
    Check 'Empty dashboard lists show a friendly empty-state message (3)' (Eval "['company-active-jobs','company-recent-apps','company-talent-preview'].every(id=>document.querySelector('#'+id+' .workspace-empty')?.textContent.trim().length>20)")
    Check 'Greeting has a name and no dangling comma' (Eval "!/,\s*$/.test(document.getElementById('company-greeting')?.textContent ?? document.querySelector('h1').textContent)")
    Check 'No unsupported verified-university wording' (Eval "!/verified university/i.test(document.body.innerText)")
    Shot 'company-dashboard-signed-in-1440'
    Size 390; Shot 'company-dashboard-signed-in-390'
    Target 'Company dashboard buttons are 44px tall at 390' 'main .button'
    Open 'pages/company/company-messages.html'; Target 'Company chat input is 44px tall at 390' '#company-chat-input'
    Open 'pages/company/company-talent.html'; Target 'Talent skill filter is 44px tall at 390' '#talent-skill-filter'
    Check 'Talent filter wording no longer claims verified skills' (Eval "document.querySelector('#talent-skill-filter option[value=all]').textContent.trim()==='All skills'")
    Open 'pages/company/company-applications.html'; Target 'Company filter pills are 44px tall at 390' '.teacher-filter-btn'
    Size 1440
    # Sign out, then the guard applies again; signing in returns to the requested page.
    Eval "localStorage.removeItem('codementor-company-session');true" | Out-Null
    Open 'pages/company/company-talent.html'
    Check 'After company sign-out the company page redirects to sign-in again' ((Path) -like 'pages/auth/company-login.html?next=*')
    Eval "document.getElementById('email').value='qa-company@example.com';document.getElementById('password').value='QaCompanyPass123!';document.getElementById('company-login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 4500
    Check 'Company sign-in returns to the requested page' ((Path) -eq 'pages/company/company-talent.html')

    # 2. Auth touch targets at 390 (guest).
    Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Size 390
    foreach ($p in @('pages/auth/login.html','pages/auth/signup.html','pages/auth/company-login.html','pages/auth/admin-login.html')) {
        Open $p
        Target "$p video toggle is 44px tall at 390" '.auth-video-toggle'; Target "$p password toggle is 44px tall at 390" '.password-toggle'
    }
    Shot 'auth-login-390'
    Check 'Sign-in pages show the favicon link' (Eval "!!document.querySelector('link[rel~=icon]')")

    # 3. Admin: schedule remove-slot and booking filters at 390.
    Size 1440; Open 'pages/auth/admin-login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 1200
    Size 390
    Open 'pages/admin/admin-schedule.html'; Target 'Admin remove-slot buttons are 44x44 at 390' '.btn-remove-slot' $true; Shot 'admin-schedule-390'
    Open 'pages/admin/admin-bookings.html'; Target 'Admin booking filter pills are 44px tall at 390' '.teacher-filter-btn'

    # 4. Student: coding workspace toolbar, onboarding column, placement flow frame.
    Size 1440; Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 1200
    Open 'index.html'
    Eval "cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));true" | Out-Null
    Size 390; Open 'pages/student/workspace.html?task=receipt'
    Target 'Coding workspace toolbar buttons are 44px tall at 390' '.coding-toolbar .button'
    Shot 'workspace-390'
    foreach ($w in @(1440, 390)) {
        Size $w; Open 'pages/student/onboarding.html'
        Check "Onboarding $w px: left column is not one unpadded card" (Eval "(()=>{const s=getComputedStyle(document.querySelector('.onboarding-sidebar'));return parseFloat(s.borderTopWidth)===0||parseFloat(s.paddingLeft)>=12})()")
        Check "Onboarding $w px: note card has padding" (Eval "parseFloat(getComputedStyle(document.querySelector('.onboarding-note')).paddingLeft)>=16")
        Check "Onboarding $w px: content clear of sidebar and screen edges" (Framed '.preferences-panel')
        Shot "onboarding-$w"
    }
    Size 1440; Open 'pages/student/placement-intro.html'
    Eval "(()=>{const s=placementStore;let a=s.begin(s.capture());a=s.save({answers:s.bank().questions.map((q,i)=>i<3?q.correct:null),currentQuestion:3},JSON.stringify(a),s.capture());return true})()" | Out-Null
    foreach ($w in @(1440, 390)) {
        Size $w; Open 'pages/student/placement-intro.html'; Check "Placement intro $w px framed" (Framed '.preferences-panel'); Shot "placement-intro-$w"
        Open 'pages/student/placement-question.html'
        Check "Placement question $w px shows the question and answers" (Eval "document.getElementById('question-title').textContent.trim().length>5&&document.querySelectorAll('#answer-options .answer-option').length>=2&&!document.querySelector('#question-message.is-error')")
        Check "Placement question $w px framed" (Framed '.question-panel')
        Target "Placement question $w px answer cards are 44px" '.answer-option'; Target "Placement question $w px question chips are 44px" '.question-number'
        Shot "placement-question-$w"
    }
    Eval "(()=>{const s=placementStore;const a=s.read();s.save({answers:s.bank().questions.map(q=>q.correct),currentQuestion:s.bank().questions.length-1},JSON.stringify(a),s.capture());return true})()" | Out-Null
    foreach ($w in @(1440, 390)) { Size $w; Open 'pages/student/placement-review.html'; Check "Placement review $w px framed" (Framed '.preferences-panel'); Shot "placement-review-$w" }
    Eval "(()=>{const s=placementStore;s.submit(JSON.stringify(s.read()),s.capture());return true})()" | Out-Null
    foreach ($w in @(1440, 390)) {
        Size $w; Open 'pages/student/placement-results.html'
        Check "Placement results $w px show the score ring and the recommended level badge" (Eval "!document.getElementById('results-content').hidden&&document.querySelector('.score-circle').style.getPropertyValue('--score')!==''&&/^[1-9]/.test(document.querySelector('.starting-level').dataset.recommendedStart||'')&&!['none','normal'].includes(getComputedStyle(document.querySelector('.starting-level'),'::before').content)")
        Check "Placement results $w px framed" (Framed '.starting-level')
        Check "Placement results $w px has no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth+1')
        Shot "placement-results-$w"
    }
    Check 'No uncaught JavaScript exceptions' ($script:errors.Count -eq 0)
    if ($script:errors.Count) { Write-Output ('JS errors: ' + ($script:errors -join ' || ')) }
    Write-Output "SUMMARY passed=$passes failed=$($failures.Count) skipped=$($script:skips.Count)"
    if ($failures.Count) { throw ('Failed: ' + ($failures -join '; ')) }
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
