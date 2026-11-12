# Community v2 browser checks (open channels + private study groups) and screenshots.
#   -Shots <label>   prefix for screenshots in docs/evidence/community-v2/ (default: run)
# Prints PASS/FAIL lines and a SUMMARY line; exits non-zero when any check fails.
param([string]$Shots = 'run')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$out = Join-Path $root 'docs/evidence/community-v2'; New-Item -ItemType Directory -Force $out | Out-Null
$profile = Join-Path $env:TEMP ('cm-community-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8876') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$studentSocket = $null; $adminSocket = $null; $script:failures = @(); $script:passes = 0; $script:errors = @()
try {
    for ($i=0; $i -lt 50; $i++) { try { Invoke-WebRequest 'http://127.0.0.1:8876/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($i=0; $i -lt 80 -and !(Test-Path $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $studentSocket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $socket = $studentSocket
    $script:sequence = 0
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $r=$socket.Receive()|ConvertFrom-Json; if ($r.method -eq 'Runtime.exceptionThrown') { $script:errors += $r.params.exceptionDetails.exception.description } } while ($r.id -ne $id)
        if ($r.error) { throw ($r.error|ConvertTo-Json) }
        return $r.result
    }
    function Eval($e) { $x=Cdp 'Runtime.evaluate' @{expression=$e;returnByValue=$true;awaitPromise=$true}; if($x.exceptionDetails){throw ($x.exceptionDetails|ConvertTo-Json -Depth 6)}; return $x.result.value }
    function Open($p) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8876/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 900; Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    # Full-page shot without captureBeyondViewport (it hung for 120 s at 390 px under mobile emulation in the group-4 run):
    # grow the viewport to the page height, capture, then restore 900 px.
    function Shot($n) {
        $w = [int](Eval 'innerWidth'); $h = [int](Eval 'Math.min(Math.max(document.documentElement.scrollHeight, innerHeight), 8000)')
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=$h;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 300
        $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=70}
        [IO.File]::WriteAllBytes((Join-Path $out "$Shots-$n.jpg"),[Convert]::FromBase64String($s.data))
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 200
    }
    function Check($name,$ok) { if ($ok) { $script:passes++; Write-Output "PASS $name" } else { $script:failures += $name; Write-Output "FAIL $name" } }
    function Wait($ms) { Start-Sleep -Milliseconds $ms }
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440
    Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/services/community.html'
    Check 'Guests are sent to sign-in and see nothing' (Eval "location.pathname.endsWith('/auth/login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Wait 1200
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    Check 'Signed-in student lands on the community' (Eval "location.pathname.endsWith('/services/community.html')")
    Check 'First run: open channels listed, study groups separate, composer ready, welcome with three actions' (Eval "document.querySelectorAll('#community-channels .community-channel').length===9 && document.querySelectorAll('#community-directory .community-channel').length===5 && !document.getElementById('community-composer').hidden && [...document.querySelectorAll('.community-welcome button')].map(b=>b.textContent).join('|')==='Ask your first question|Introduce yourself|Browse open channels'")
    Check 'Active language is pinned first among channels' (Eval "document.querySelectorAll('#community-channels .community-channel')[1].classList.contains('is-active-language')")
    Check 'One small local-data note, not a banner' (Eval "document.querySelectorAll('.community-storage-note').length===1 && document.querySelector('.community-storage-note').getBoundingClientRect().height<40")
    Shot 'first-run-1440'
    Size 390; Shot 'first-run-390'; Size 1440
    # Post in an open channel immediately (no approval), with an XSS payload and a code block.
    Eval "document.getElementById('community-ask').click();document.getElementById('post-channel').value='help';document.getElementById('post-title').value='How do Python for loops work with range?';document.getElementById('post-body').value='<img src=x onerror=alert(1)> I expected 1 to 5.';document.querySelector('.community-code-details').open=true;document.getElementById('post-language').value='python';document.getElementById('post-code').value='for i in range(1, 5):\n    print(i)  # why not 5?';document.getElementById('post-tags').value='loops, range';document.getElementById('community-composer').requestSubmit();true" | Out-Null
    Wait 500
    Check 'Open channel: posted at once, rendered as text (no injected image)' (Eval "document.querySelector('.community-card-open')?.textContent==='How do Python for loops work with range?' && !document.querySelector('#community-posts img') && document.querySelector('.community-card-preview').textContent.startsWith('<img')")
    Check 'Toast confirms the post with Undo (aria-live region)' (Eval "!!document.querySelector('.ik-toast') && [...document.querySelectorAll('.ik-toast button')].some(b=>b.textContent==='Undo') && !!document.querySelector('[aria-live]')")
    Eval "document.getElementById('post-title').value='for loop range question';document.getElementById('post-tags').value='range';document.getElementById('post-title').dispatchEvent(new Event('input'));true" | Out-Null
    Wait 500
    Check 'Similar questions appear while typing, labelled as not AI' (Eval "!document.getElementById('community-similar').hidden && document.getElementById('community-similar').textContent.includes('not AI') && document.querySelectorAll('#community-similar .community-widget-link').length===1")
    Eval "document.getElementById('community-composer').reset();document.getElementById('post-title').dispatchEvent(new Event('input'));true" | Out-Null
    # Drawer: focus moves in, code is highlighted, Esc closes and returns focus.
    Eval "window.opener1=document.querySelector('.community-card-open');opener1.click();true" | Out-Null
    Wait 300
    Check 'Post drawer opens as a modal with focus on its title' (Eval "document.getElementById('community-post-dialog').open && document.activeElement?.id==='community-drawer-title'")
    Check 'Code block is highlighted and copyable' (Eval "!!document.querySelector('#community-post-dialog .tok-kw') && [...document.querySelectorAll('#community-post-dialog button')].some(b=>b.textContent==='Copy code') && document.querySelector('#community-post-dialog code').textContent==='for i in range(1, 5):\n    print(i)  # why not 5?'")
    Shot 'drawer-1440'
    Size 390; Wait 200; Shot 'drawer-390'
    Check 'Drawer controls are at least 44px tall at 390' (Eval "[...document.querySelectorAll('#community-post-dialog button, #community-post-dialog textarea')].filter(b=>b.getBoundingClientRect().height>0).every(b=>b.getBoundingClientRect().height>=43.5)")
    Size 1440
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    Wait 300
    Check 'Esc closes the drawer and focus returns to the card' (Eval "!document.getElementById('community-post-dialog').open && document.activeElement===opener1")
    # Study group: request, admin approval in another tab, privacy.
    Eval "[...document.querySelectorAll('#community-directory .community-channel')].find(b=>b.textContent.includes('Help circle')).click();true" | Out-Null
    Wait 200
    Check 'Study group shows a private gate with a join form; no group posts' (Eval "!document.getElementById('community-access').hidden && !!document.getElementById('join-reason') && document.getElementById('community-composer').hidden && document.querySelectorAll('.community-card').length===0")
    Eval "document.getElementById('join-reason').value='I want to work through help questions with a small group.';document.querySelector('#community-access form').requestSubmit();true" | Out-Null
    Wait 300
    Check 'Pending request keeps the group private' (Eval "communityMembership.state('study-help')==='pending' && document.getElementById('community-composer').hidden")
    Check 'Student cannot approve their own request' (Eval "communityMembership.decide(JSON.parse(localStorage.getItem(communityMembership.key)).requests[0].id,'approved').then(()=>false,()=>true)")
    $newTab=Cdp 'Target.createTarget' @{url='http://127.0.0.1:8876/pages/admin/admin-community.html'}
    Wait 800
    $adminTarget=(Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.id -eq $newTab.targetId}
    $adminSocket=New-Object CdpSocket($adminTarget.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $socket=$adminSocket
    Cdp 'Runtime.enable' @{} | Out-Null
    Check 'Admin community page is protected' (Eval "location.pathname.endsWith('/auth/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Wait 1000
    Check 'Admin sees the study-group request' (Eval "location.pathname.endsWith('/admin-community.html') && document.querySelectorAll('#membership-requests article').length===1")
    Eval "document.querySelector('#membership-requests button').click();true" | Out-Null
    Wait 300
    $socket=$studentSocket
    Check 'Approval opens the group in the student tab without reloading' (Eval "communityMembership.state('study-help')==='approved' && !document.getElementById('community-composer').hidden")
    Eval "document.getElementById('post-title').value='Help circle weekly plan';document.getElementById('post-body').value='Members only plan.';document.getElementById('community-composer').requestSubmit();true" | Out-Null
    Wait 400
    Check 'Member posts inside the study group' (Eval "[...document.querySelectorAll('.community-card-open')].some(b=>b.textContent==='Help circle weekly plan')")
    # Another student: sees open posts, never the group post; replies; then the author accepts the answer.
    Eval "sessionStorage.setItem('qa-demo-session',cmStorage.getItem('codementor-demo-session'));cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Other Student',email:'community-other@example.com',role:'student',isDemo:true}));true" | Out-Null
    Open 'pages/services/community.html'
    Check 'Another student reads open channels but never the private group post' (Eval "[...document.querySelectorAll('.community-card-open')].some(b=>b.textContent==='How do Python for loops work with range?') && ![...document.querySelectorAll('.community-card-open')].some(b=>b.textContent==='Help circle weekly plan') && communityMembership.state('study-help')==='none'")
    Eval "communityStore.reply(communityStore.query({search:'for loops work'}).items[0].id,'range(1, 5) stops before 5; use range(1, 6).').then(()=>true)" | Out-Null
    Eval "cmStorage.setItem('codementor-demo-session',sessionStorage.getItem('qa-demo-session'));true" | Out-Null
    Open 'pages/services/community.html'
    Eval "[...document.querySelectorAll('.community-card-open')].find(b=>b.textContent==='How do Python for loops work with range?').click();true" | Out-Null
    Wait 300
    Eval "[...document.querySelectorAll('#community-post-dialog button')].find(b=>b.textContent==='Accept answer').click();true" | Out-Null
    Wait 400
    Check 'Author accepts the answer: accepted badge, Solved, Undo toast' (Eval "!!document.querySelector('#community-post-dialog .community-reply.is-accepted') && document.querySelector('#community-post-dialog').textContent.includes('Solved') && [...document.querySelectorAll('.ik-toast button')].some(b=>b.textContent==='Undo')")
    Eval "document.querySelector('.community-drawer-close').click();true" | Out-Null
    Wait 200
    # Reputation: the answerer sees a one-time celebration and real numbers; badges show next to names.
    Eval "sessionStorage.setItem('qa-demo-session',cmStorage.getItem('codementor-demo-session'));cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Other Student',email:'community-other@example.com',role:'student',isDemo:true}));true" | Out-Null
    Open 'pages/services/community.html'
    Wait 300
    Check 'Answerer: one-time celebration, profile shows the accepted answer and 10 points' (Eval "[...document.querySelectorAll('.ik-toast')].some(t=>t.textContent.includes('Your answer was accepted')) && document.getElementById('community-profile').textContent.includes('Accepted answers1') && document.getElementById('community-profile').textContent.includes('Helpful points10')")
    Check 'Badges appear next to the answerer in Top helpers' (Eval "!!document.querySelector('#community-helpers .community-badge-chip[data-badge=problem-solver]')")
    Open 'pages/services/community.html'
    Wait 300
    Check 'Celebration does not repeat on the next visit' (Eval "![...document.querySelectorAll('.ik-toast')].some(t=>t.textContent.includes('Your answer was accepted'))")
    Eval "cmStorage.setItem('codementor-demo-session',sessionStorage.getItem('qa-demo-session'));true" | Out-Null
    Open 'pages/services/community.html'
    Shot 'reputation-1440'
    # Layout at four widths, touch targets, mobile tabs.
    foreach ($w in @(1440, 1024, 768, 390)) { Size $w; Check "$w px: no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth+1') }
    Size 1440; Shot 'feed-1440'
    Size 1024; Shot 'feed-1024'
    Size 390; Shot 'feed-390'
    # The card title button is a stretched link: its ::after overlay makes the whole card the touch target.
    Check 'Phone: visible community controls are at least 44px tall (card titles: the whole card is the target)' (Eval "[...document.querySelectorAll('.community-v2 button:not(.community-card-open), .community-v2 input, .community-v2 select, .community-v2 summary')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0}).every(b=>b.getBoundingClientRect().height>=43.5) && getComputedStyle(document.querySelector('.community-card-open'),'::after').position==='absolute' && document.querySelector('.community-card').getBoundingClientRect().height>=43.5")
    Eval "document.getElementById('community-tab-highlights').click();true" | Out-Null
    Wait 200
    Check 'Phone tabs switch to Highlights (aria-selected)' (Eval "document.getElementById('community-tab-highlights').getAttribute('aria-selected')==='true' && document.getElementById('community-right').getBoundingClientRect().height>0 && document.getElementById('community-center').getBoundingClientRect().height===0")
    Shot 'highlights-390'
    Eval "document.getElementById('community-tab-feed').click();true" | Out-Null
    Size 1440
    # Admin removes the member; private content disappears in the open student tab; stale actions blocked.
    Eval "[...document.querySelectorAll('#community-directory .community-channel')].find(b=>b.textContent.includes('Help circle')).click();true" | Out-Null
    Wait 200
    Eval "window.staleSave=[...document.querySelectorAll('.community-card .community-mini')].find(b=>b.textContent==='Save');true" | Out-Null
    $socket=$adminSocket
    Eval "document.getElementById('membership-filter').value='approved';document.getElementById('membership-filter').dispatchEvent(new Event('change'));true" | Out-Null
    Eval "document.querySelector('#membership-requests textarea').value='Browser test removal reason';document.querySelector('#membership-requests button').click();true" | Out-Null
    Wait 300
    Check 'Member removal is written to the audit log' (Eval "[...document.querySelectorAll('#audit-log li')].some(li=>li.textContent.includes('Member removed') && li.textContent.includes('Browser test removal reason'))")
    $socket=$studentSocket
    Wait 200
    Check 'Removal clears the private group in the other tab' (Eval "communityMembership.state('study-help')==='revoked' && document.querySelectorAll('.community-card').length===0 && document.getElementById('community-composer').hidden")
    Eval "window.beforePosts=localStorage.getItem('codementor-community-v1');window.staleSave?.click();true" | Out-Null
    Wait 200
    Check 'Stale actions cannot bypass revoked access' (Eval "window.beforePosts===localStorage.getItem('codementor-community-v1')")
    Eval "localStorage.setItem(communityMembership.key,'broken-records');true" | Out-Null
    Open 'pages/services/community.html'
    Check 'Corrupt membership records lock study groups only and are never overwritten' (Eval "localStorage.getItem(communityMembership.key)==='broken-records' && document.getElementById('community-status').textContent.includes('Access is locked') && !document.getElementById('community-composer').hidden && document.querySelectorAll('.community-card').length>=1")
    $socket=$adminSocket
    Eval "sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()-9*3600000}));true" | Out-Null
    Check 'Expired admin session cannot review requests' (Eval "(()=>{try{communityMembership.requests();return false}catch{return true}})()")
    Check 'No uncaught JavaScript exceptions' ($script:errors.Count -eq 0)
    if ($script:errors.Count) { Write-Output ('JS errors: ' + ($script:errors -join ' || ')) }
    Write-Output "SUMMARY passed=$($script:passes) failed=$($script:failures.Count)"
    if ($script:failures.Count) { throw ('Failed: ' + ($script:failures -join '; ')) }
} finally {
    foreach($connection in @($studentSocket,$adminSocket)) {if($connection){$connection.Dispose()}}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
