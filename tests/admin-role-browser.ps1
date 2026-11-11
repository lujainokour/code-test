$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$profile = Join-Path $env:TEMP ('cm-admin-role-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8877') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($attempt=0; $attempt -lt 50; $attempt++) {
        try { Invoke-WebRequest 'http://127.0.0.1:8877/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break }
        catch { Start-Sleep -Milliseconds 100 }
    }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0
    function Cdp($method,$parameters) {
        $script:sequence++
        $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $response=$socket.Receive()|ConvertFrom-Json } while ($response.id -ne $id)
        if ($response.error) { throw ($response.error|ConvertTo-Json) }
        return $response.result
    }
    function Eval($expression) {
        $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}
        if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}
        return $result.result.value
    }
    function Open($path) {
        $navigation = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8877/' + $path)}
        if ($navigation.errorText) {throw $navigation.errorText}
        Start-Sleep -Milliseconds 600
    }
    function Check($name,$passed) { if (!$passed) {throw $name}; Write-Output "PASS $name" }
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Check 'Instructor entry points are removed' (Eval "!document.querySelector('a[href*=teacher]')")
    foreach ($page in @('admin-sessions','admin-schedule','admin-bookings','admin-session-students','admin-peer-mentoring','admin-students','admin-courses')) {
        Open "pages/admin/$page.html"
        Check "Guest cannot open $page" (Eval "location.pathname.endsWith('/auth/admin-login.html') && new URLSearchParams(location.search).get('next')==='pages/admin/$page.html'")
    }
    Open 'pages/admin/admin-sessions.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 700
    Check 'Admin login returns to session management' (Eval "location.pathname.endsWith('/admin/admin-sessions.html') && document.querySelectorAll('#teacher-sessions-list article').length>0")
    Check 'Admin navigation includes the migrated sections' (Eval "['admin-sessions.html','admin-schedule.html','admin-bookings.html','admin-session-students.html'].every(path=>[...document.querySelectorAll('.workspace-navigation a')].some(a=>a.href.endsWith(path)))")
    Eval "document.getElementById('open-create-modal').click();document.getElementById('sess-title').value='Connected admin session';document.getElementById('sess-description').value='A guided session connected to student booking history.';document.getElementById('create-session-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 350
    Check 'Create session form publishes to the shared catalogue' (Eval "adminSessionsStore.getPublicSessions().some(s=>s.topic==='Connected admin session') && !document.getElementById('create-session-modal').open")
    Open 'pages/admin/admin-schedule.html'
    Check 'Schedule is editable and requires manual decisions' (Eval "document.querySelectorAll('.teacher-day-row').length===7 && !document.getElementById('instant-booking')")
    Eval "document.getElementById('default-rate').value='32';document.getElementById('teacher-schedule-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 250
    Check 'Admin can save availability and pricing' (Eval "adminSessionsStore.getSchedule().defaultRate===32")
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 650
    Open 'pages/services/peer-mentoring.html'
    Check 'Students see platform sessions without an instructor portal' (Eval "document.body.textContent.includes('Platform sessions') && !document.body.textContent.includes('Instructor portal')")
    $booking = Eval "(async()=>{const s=adminSessionsStore.getPublicSessions().find(s=>s.topic==='Connected admin session');const slot=adminSessionsStore.getAvailableSlots(s.sessionId)[0];const b=await adminSessionsStore.requestBooking(s.sessionId,slot.id,'Please help me understand Python functions.','student@example.com');sessionStorage.setItem('test-booking',b.id);return b.id;})()"
    Open 'pages/admin/admin-bookings.html'
    Check 'Student request is visible in admin bookings' (Eval "document.querySelector('#teacher-bookings-list').textContent.includes('Connected admin session')")
    Eval "window.prompt=()=> 'https://meet.example.com/admin-room';[...document.querySelectorAll('.btn-approve')].find(b=>b.dataset.id===sessionStorage.getItem('test-booking')).click();true" | Out-Null
    Start-Sleep -Milliseconds 350
    Check 'Admin can confirm through the booking interface' (Eval "adminSessionsStore.getBookings().find(b=>b.id===sessionStorage.getItem('test-booking')).status==='Confirmed'")
    Open 'pages/student/requests.html#instructor-bookings'
    Check 'Legacy booking fragment selects platform history' (Eval "location.hash==='#platform-bookings'")
    Check 'Student history receives status and meeting link' (Eval "[...document.querySelectorAll('#platform-bookings a')].some(a=>a.href==='https://meet.example.com/admin-room') && document.getElementById('platform-bookings').textContent.includes('Confirmed')")
    Open 'pages/admin/admin-session-students.html'
    Check 'Confirmed student appears in follow-up' (Eval "adminSessionsStore.getStudents().some(s=>s.linkedStudent&&s.email==='student@example.com') && document.getElementById('teacher-students-list').textContent.includes('Lujain Okour')")
    Open 'pages/admin/admin-peer-mentoring.html'
    Check 'Admin has student tutor and booking oversight' (Eval "document.getElementById('admin-mentoring-monitor').textContent.includes('Student session bookings') && document.getElementById('peer-workspace')")
    Check 'Review queue is not seeded automatically' (Eval "peerMentoringStore.applications().length===0")
    Eval "[...document.querySelectorAll('#peer-sample-data button')].find(b=>b.textContent==='Load sample data').click();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Load sample data adds labelled pending, approved and rejected samples' (Eval "(()=>{const a=peerMentoringStore.applications();return a.length===3 && a.every(x=>x.sample===true) && ['Pending','Approved','Rejected'].every(s=>a.some(x=>x.status===s)) && document.getElementById('peer-workspace').textContent.includes('SAMPLE APPLICATION')})()")
    Eval "const note=document.querySelector('[id^=feedback-]');note.value='My unsaved review note';note.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new StorageEvent('storage',{key:'codementor-peer-mentoring-v1'}));true" | Out-Null
    Check 'External request updates offer refresh without erasing review notes' (Eval "!!document.getElementById('admin-peer-refresh') && document.querySelector('[id^=feedback-]').value==='My unsaved review note'")
    Eval "document.getElementById('admin-peer-refresh').click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Application refresh clears the notification and retains the sample set' (Eval "!document.getElementById('admin-peer-refresh') && peerMentoringStore.applications().filter(a=>a.sample).length===3")
    Open 'pages/admin/admin-dashboard.html'
    Check 'Dashboard includes platform bookings and session management' (Eval "document.querySelector('[data-stat=bookings]') && document.querySelector('[data-stat=sessions]') && document.body.textContent.includes('Session follow-up')")
    Eval "document.querySelector('.cm-guide-close')?.click();true" | Out-Null
    foreach($width in @(1440,390)) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 600)} | Out-Null
        Check "Admin dashboard fits $width pixels" (Eval "document.documentElement.scrollWidth<=innerWidth+1")
        $capture=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path $root "docs/admin-role-$width.png"),[Convert]::FromBase64String($capture.data))
    }
    foreach($page in @('admin-sessions','admin-schedule','admin-bookings','admin-session-students')) {
        Open "pages/admin/$page.html"
        foreach($width in @(1440,390)) {
            Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 600)} | Out-Null
            Check "$page fits $width pixels" (Eval "document.documentElement.scrollWidth<=innerWidth+1")
            $capture=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
            [IO.File]::WriteAllBytes((Join-Path $root "docs/admin-role-$page-$width.png"),[Convert]::FromBase64String($capture.data))
        }
    }
    Open 'pages/teacher/teacher-bookings.html'
    Check 'Legacy teacher booking URL redirects to admin bookings' (Eval "location.pathname.endsWith('/admin/admin-bookings.html')")
    Eval "document.getElementById('admin-exit-button').click();true" | Out-Null
    Start-Sleep -Milliseconds 350
    Open 'pages/auth/teacher-login.html'
    Check 'Legacy teacher login opens admin login' (Eval "location.pathname.endsWith('/auth/admin-login.html')")
    Eval "localStorage.setItem('codementor-teacher-session',JSON.stringify({role:'teacher',isDemo:true,email:'teacher@example.com'}));true" | Out-Null
    Open 'pages/teacher/teacher-sessions.html'
    Check 'Legacy teacher identity cannot bypass admin sign in' (Eval "location.pathname.endsWith('/auth/admin-login.html')")
    Open 'pages/auth/company-login.html'
    Eval "document.getElementById('fill-company-demo').click();document.getElementById('company-login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 650
    Check 'Company login still works after retiring the teacher role' (Eval "location.pathname.endsWith('/company/company-dashboard.html') && document.getElementById('account-name')")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
