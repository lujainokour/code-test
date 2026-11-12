# Community browser checks for the GROUPS model (approval-required language groups pinned by the
# student's language, explicit Open switch, bulk decisions) plus the community features, with
# screenshots in docs/evidence/community-v2/.
#   -Shots <label>   prefix for screenshots (default: run)
# Prints PASS/FAIL lines and a SUMMARY line; exits non-zero when any check fails.
# Step scripts that declare variables are wrapped in (()=>{...})() so repeated runs in one page cannot collide.
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
    function Open($p) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8876/' + $p)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 1000; Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null }
    function Size($w) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 250 }
    # Full-page shot without captureBeyondViewport (it hung under mobile emulation): grow the viewport, capture, restore.
    function Shot($n) {
        $w = [int](Eval 'innerWidth'); $h = [int](Eval 'Math.min(Math.max(document.documentElement.scrollHeight, innerHeight), 8000)')
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=$h;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 300
        $s=Cdp 'Page.captureScreenshot' @{format='jpeg';quality=70}
        [IO.File]::WriteAllBytes((Join-Path $out "$Shots-$n.jpg"),[Convert]::FromBase64String($s.data))
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=900;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 200
    }
    function Check($name,$ok) { if ($ok) { $script:passes++; Write-Output "PASS $name" } else { $script:failures += $name; Write-Output "FAIL $name" } }
    function Wait($ms) { Start-Sleep -Milliseconds $ms }
    # The tab in use is brought to the front on every switch (a background tab may produce no frames).
    function UseStudent { $script:socket = $studentSocket; Cdp 'Page.bringToFront' @{} | Out-Null }
    function UseAdmin { $script:socket = $adminSocket; Cdp 'Page.bringToFront' @{} | Out-Null }
    function AsOther { Eval "sessionStorage.setItem('qa-demo-session',cmStorage.getItem('codementor-demo-session'));cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Other Student',email:'community-other@example.com',role:'student',isDemo:true}));true" | Out-Null }
    function AsDemo { Eval "cmStorage.setItem('codementor-demo-session',sessionStorage.getItem('qa-demo-session'));true" | Out-Null }
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440
    Open 'index.html'; Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/services/community.html'
    Check 'Guests are sent to sign-in and see nothing' (Eval "location.pathname.endsWith('/auth/login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Wait 1300
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    # 1. First visit: your language group (Python), pinned and marked, with one Request to join; nothing readable yet.
    Check 'First visit lands on the Python group gate: header, description, one-sentence welcome, Request to join; no composer, no posts' (Eval "location.pathname.endsWith('/services/community.html') && document.getElementById('community-access').textContent.includes('Python questions, tips and code reviews') && document.getElementById('community-access').textContent.includes('Welcome! Groups open after approval') && [...document.querySelectorAll('#community-access button')].map(b=>b.textContent).join('|')==='Request to join' && document.getElementById('community-composer').hidden && document.querySelectorAll('.community-card').length===0")
    Check 'Your language group is pinned first and marked; other languages are behind Browse' (Eval "(()=>{const b=document.querySelectorAll('#community-channels > .community-channel');return b[1].textContent.includes('Python') && b[1].textContent.includes('Your language') && b[1].classList.contains('is-active-language') && document.getElementById('community-other-languages').hidden && document.getElementById('community-browse-toggle').textContent.includes('Browse other languages (12)')})()")
    Shot 'groups-first-visit-1440'
    Size 390; Shot 'groups-first-visit-390'; Size 1440
    Eval "document.getElementById('join-reason').value='I am starting Python and want to ask questions with the group.';document.querySelector('#community-access form').requestSubmit();true" | Out-Null
    Wait 400
    Check 'Request sent: Pending state with next steps and Cancel request' (Eval "communityMembership.state('python')==='pending' && document.getElementById('community-access').textContent.includes('Pending. An administrator will review your request') && [...document.querySelectorAll('#community-access button')].some(b=>b.textContent==='Cancel request')")
    Check 'Student cannot approve their own request' (Eval "communityMembership.decide(JSON.parse(localStorage.getItem(communityMembership.key)).requests[0].id,'approved').then(()=>false,()=>true)")
    # 2. Admin tab: SAMPLE data (with sample members and demo requests), pending badges, bulk approve.
    $newTab=Cdp 'Target.createTarget' @{url='http://127.0.0.1:8876/pages/admin/admin-community.html'}
    Wait 900
    $adminTarget=(Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.id -eq $newTab.targetId}
    $adminSocket=New-Object CdpSocket($adminTarget.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    UseAdmin
    Cdp 'Runtime.enable' @{} | Out-Null
    Size 1440
    Check 'Admin community page is protected' (Eval "location.pathname.endsWith('/auth/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Wait 1200
    Eval "document.getElementById('sample-load').click();true" | Out-Null
    Wait 900
    Check 'SAMPLE data loads posts, sample members and demo requests; groups need approval by default; pending badges' (Eval "document.getElementById('sample-status').textContent.includes('30 sample posts added') && document.querySelectorAll('#channel-stats tr').length===21 && [...document.querySelectorAll('#channel-stats tr')].every(r=>r.dataset.mode==='approval') && document.querySelector('#channel-stats tr[data-channel=python] .community-count-badge')?.textContent==='1' && document.querySelector('#channel-stats tr[data-channel=java] .community-count-badge')?.textContent==='1'")
    Eval "document.getElementById('sample-load').click();true" | Out-Null
    Wait 500
    Check 'Loading SAMPLE data again adds nothing' (Eval "document.getElementById('sample-status').textContent.includes('already loaded')")
    Eval "(()=>{const a=[...document.querySelectorAll('#membership-requests article')].find(x=>x.querySelector('h3').textContent.startsWith('Demo Student'));a.querySelector('.membership-select').checked=true;document.getElementById('bulk-note').value='Welcome to the Python group!';document.getElementById('bulk-approve').click();return true})()" | Out-Null
    Wait 600
    Check 'Bulk approve: the selected request is approved with the shared note and audited' (Eval "document.getElementById('membership-status').textContent.includes('1 request approved') && [...document.querySelectorAll('#audit-log li')].some(li=>li.textContent.includes('Membership approved'))")
    Shot 'groups-admin-1440'
    UseStudent
    Wait 300
    Check 'Approval opens the Python group live in the student tab: member state, composer, SAMPLE posts' (Eval "communityMembership.state('python')==='approved' && document.getElementById('community-access').textContent.includes('Approved member') && !document.getElementById('community-composer').hidden && document.querySelectorAll('.community-card').length>=8")
    # 3. Member features: post with XSS and code, toast, similar questions, drawer.
    Eval "document.getElementById('post-title').value='How do Python for loops work with range?';document.getElementById('post-body').value='<img src=x onerror=alert(1)> I expected 1 to 5.';document.querySelector('.community-code-details').open=true;document.getElementById('post-language').value='python';document.getElementById('post-code').value='for i in range(1, 5):\n    print(i)  # why not 5?';document.getElementById('post-tags').value='loops, range';document.getElementById('community-composer').requestSubmit();true" | Out-Null
    Wait 600
    Check 'Member posts in the group; text stays text (no injected image); toast with Undo' (Eval "[...document.querySelectorAll('.community-card-open')].some(b=>b.textContent==='How do Python for loops work with range?') && !document.querySelector('#community-posts img') && [...document.querySelectorAll('.ik-toast button')].some(b=>b.textContent==='Undo')")
    Eval "document.getElementById('post-title').value='for loop range question';document.getElementById('post-tags').value='range';document.getElementById('post-title').dispatchEvent(new Event('input'));true" | Out-Null
    Wait 500
    Check 'Similar questions appear while typing, labelled as not AI' (Eval "!document.getElementById('community-similar').hidden && document.getElementById('community-similar').textContent.includes('not AI') && document.querySelectorAll('#community-similar .community-widget-link').length>=1")
    Eval "document.getElementById('community-composer').reset();document.getElementById('post-title').dispatchEvent(new Event('input'));true" | Out-Null
    Eval "window.opener1=[...document.querySelectorAll('.community-card-open')].find(b=>b.textContent==='How do Python for loops work with range?');opener1.click();true" | Out-Null
    Wait 400
    Check 'Drawer: modal, focus on the title, highlighted code' (Eval "document.getElementById('community-post-dialog').open && document.activeElement?.id==='community-drawer-title' && !!document.querySelector('#community-post-dialog .tok-kw')")
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    Wait 300
    Check 'Esc closes the drawer and focus returns to the card' (Eval "!document.getElementById('community-post-dialog').open && document.activeElement===opener1")
    # 4. Ask the community as a member: prefilled draft, nothing posted.
    Open 'pages/student/workspace.html?task=receipt'
    Wait 1500
    Eval "document.getElementById('code-editor').value='price = float(input())\nprint(price)';sessionStorage.setItem('qa-before',localStorage.getItem('codementor-community-v1')||'');document.getElementById('community-ask-link').click();true" | Out-Null
    Wait 1300
    Check 'Ask the community (member): Python group composer prefilled with task and code; nothing posted' (Eval "location.search.includes('group=python') && document.getElementById('post-title').value==='Help with: Build a simple receipt' && document.getElementById('post-code').value==='price = float(input())\nprint(price)' && (localStorage.getItem('codementor-community-v1')||'')===sessionStorage.getItem('qa-before')")
    Eval "document.getElementById('community-composer').reset();true" | Out-Null
    # 5. Another student (no membership): Ask opens the gate; the group stays private.
    AsOther
    Open 'pages/student/workspace.html?task=receipt'
    Wait 1500
    Eval "document.getElementById('community-ask-link').click();true" | Out-Null
    Wait 1300
    Check 'Ask the community (non-member): Python Request to join screen with a friendly message; draft not used' (Eval "document.getElementById('community-status').textContent.includes('To ask in the Python group, request to join first') && document.getElementById('post-title').value==='' && [...document.querySelectorAll('#community-access button')].some(b=>b.textContent==='Request to join') && document.querySelectorAll('.community-card').length===0")
    Check 'Non-member reads no Python post anywhere' (Eval "communityStore.query({search:'for loops work'}).total===0")
    # Admin opens Help explicitly (audited); the non-member can now read it without approval.
    UseAdmin
    Eval "window.confirm=()=>true;document.getElementById('access-note').value='Open Help for the exam week';[...document.querySelectorAll('#channel-stats button')].find(b=>b.dataset.modeSwitch==='help').click();true" | Out-Null
    Wait 700
    Check 'Admin opens Help explicitly; recorded in the audit log' (Eval "document.querySelector('#channel-stats tr[data-channel=help]').dataset.mode==='open' && [...document.querySelectorAll('#audit-log li')].some(li=>li.textContent.includes('Group opened') && li.textContent.includes('Open Help for the exam week'))")
    UseStudent
    Wait 300
    Eval "[...document.querySelectorAll('#community-channels > .community-channel')].find(b=>b.textContent.includes('Help')).click();true" | Out-Null
    Wait 300
    Check 'Opened group: any signed-in student reads and can post without approval' (Eval "document.getElementById('community-access').hidden && !document.getElementById('community-composer').hidden && document.querySelectorAll('.community-card').length>=5")
    AsDemo
    # 6. Changing language: JavaScript is pinned now; the Python membership is kept (Browse shows it).
    Eval "cmStorage.setItem('codementor-demo-language',JSON.stringify('javascript'));true" | Out-Null
    Open 'pages/services/community.html'
    Check 'After changing language: JavaScript pinned first with Request to join; Python membership kept and hidden from the main list' (Eval "(()=>{const b=document.querySelectorAll('#community-channels > .community-channel');return b[1].textContent.includes('JavaScript') && b[1].textContent.includes('Your language') && communityMembership.state('python')==='approved' && ![...b].some(x=>x.textContent.includes('Python')) && [...document.querySelectorAll('#community-access button')].some(x=>x.textContent==='Request to join')})()")
    Eval "document.getElementById('community-browse-toggle').click();true" | Out-Null
    Wait 200
    Check 'Browse other languages shows Python as Member' (Eval "[...document.querySelectorAll('#community-other-languages .community-channel')].find(b=>b.textContent.includes('Python'))?.textContent.includes('Member')===true")
    Eval "[...document.querySelectorAll('#community-channels > .community-channel')].find(b=>b.textContent.includes('All discussions')).click();true" | Out-Null
    Wait 300
    # 7. Layout, touch targets, phone tabs, screenshots.
    foreach ($w in @(1440, 1024, 768, 390)) { Size $w; Check "$w px: no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth+1') }
    Size 1440; Shot 'groups-feed-1440'
    Size 1024; Shot 'groups-feed-1024'
    Size 390; Shot 'groups-feed-390'
    Check 'Phone: visible community controls are at least 44px tall (card titles: the whole card is the target)' (Eval "[...document.querySelectorAll('.community-v2 button:not(.community-card-open), .community-v2 input:not([type=checkbox]), .community-v2 select, .community-v2 summary')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0}).every(b=>b.getBoundingClientRect().height>=43.5)")
    Eval "document.getElementById('community-tab-channels').click();true" | Out-Null
    Wait 200
    Check 'Phone tabs switch to Channels (aria-selected)' (Eval "document.getElementById('community-tab-channels').getAttribute('aria-selected')==='true' && document.getElementById('community-left').getBoundingClientRect().height>0 && document.getElementById('community-center').getBoundingClientRect().height===0")
    Shot 'groups-channels-390'
    Eval "document.getElementById('community-tab-feed').click();true" | Out-Null
    Size 1440
    # 8. Removal: admin removes the demo student from Python with a reason; the open tab updates; stale actions blocked.
    Eval "window.staleSave=[...document.querySelectorAll('.community-card')].find(c=>c.querySelector('.community-lang-badge')?.textContent==='Python')?.querySelector('.community-mini[aria-pressed]:not([aria-label])');true" | Out-Null
    UseAdmin
    Eval "document.getElementById('membership-filter').value='approved';document.getElementById('membership-filter').dispatchEvent(new Event('change'));true" | Out-Null
    Wait 300
    Eval "(()=>{const a=[...document.querySelectorAll('#membership-requests article')].find(x=>x.querySelector('h3').textContent.startsWith('Demo Student') && x.querySelector('b').textContent==='Python');a.querySelector('textarea').value='Browser test removal reason';[...a.querySelectorAll('button')].find(b=>b.textContent==='Remove member').click();return true})()" | Out-Null
    Wait 500
    Check 'Member removal is written to the audit log' (Eval "[...document.querySelectorAll('#audit-log li')].some(li=>li.textContent.includes('Member removed') && li.textContent.includes('Browser test removal reason'))")
    UseStudent
    Wait 300
    Check 'Removal clears Python posts from the open student tab' (Eval "communityMembership.state('python')==='revoked' && ![...document.querySelectorAll('.community-lang-badge')].some(b=>b.textContent==='Python')")
    Eval "window.beforePosts=localStorage.getItem('codementor-community-v1');window.staleSave?.click();true" | Out-Null
    Wait 300
    Check 'Stale actions cannot bypass removed access' (Eval "window.beforePosts===localStorage.getItem('codementor-community-v1')")
    Eval "if(document.getElementById('community-browse-toggle').getAttribute('aria-expanded')!=='true')document.getElementById('community-browse-toggle').click();[...document.querySelectorAll('#community-other-languages .community-channel')].find(b=>b.textContent.includes('Python')).click();true" | Out-Null
    Wait 300
    Check 'Removed state shows the note and a way back' (Eval "document.getElementById('community-access').textContent.includes('Removed: Browser test removal reason') && [...document.querySelectorAll('#community-access button')].some(b=>b.textContent==='Request to join')")
    # 9. Corrupt membership records lock approval groups only; the opened Help group still works.
    Eval "localStorage.setItem(communityMembership.key,'broken-records');true" | Out-Null
    Open 'pages/services/community.html'
    Check 'Corrupt membership records lock approval groups only and are never overwritten' (Eval "localStorage.getItem(communityMembership.key)==='broken-records' && document.getElementById('community-status').textContent.includes('Access is locked') && !document.getElementById('community-composer').hidden")
    UseAdmin
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
