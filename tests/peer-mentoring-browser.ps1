$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$profile = Join-Path $env:TEMP ('cm-access-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8876') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($attempt=0; $attempt -lt 50; $attempt++) {
        try { Invoke-WebRequest 'http://127.0.0.1:8876/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break }
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
        $navigation = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8876/' + $path)}
        if ($navigation.errorText) {throw $navigation.errorText}
        Start-Sleep -Milliseconds 600
    }
    function Check($name,$passed) { if (!$passed) {throw $name}; Write-Output "PASS $name" }
    function SignIn($email) {
        Open 'pages/auth/login.html'
        Eval "document.getElementById('email').value='$email';document.getElementById('password').value='LocalStudent123!';document.getElementById('login-form').requestSubmit();true" | Out-Null
        Start-Sleep -Milliseconds 650
    }
    function SignUp($name,$email) {
        Open 'pages/auth/signup.html'
        Eval "document.getElementById('full-name').value='$name';document.getElementById('email').value='$email';document.getElementById('age').value='22';document.getElementById('password').value='LocalStudent123!';document.getElementById('confirm-password').value='LocalStudent123!';document.getElementById('signup-form').requestSubmit();true" | Out-Null
        Start-Sleep -Milliseconds 650
        Check "$name can create an account" (Eval "location.pathname.endsWith('/onboarding.html')")
    }
    function Logout {
        Eval "document.querySelector('#logout-button,#admin-exit-button').click();true" | Out-Null
        Start-Sleep -Milliseconds 500
    }
    function Shot($name) {
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
        [IO.File]::WriteAllBytes((Join-Path $root ('docs/peer-'+$name+'.png')),[Convert]::FromBase64String($shot.data))
    }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    SignUp 'Mentor Student' 'mentor@example.com'
    Open 'pages/student/mentor-studio.html'
    Eval "document.getElementById('mentor-topics').value='Python functions and debugging';document.getElementById('mentor-bio').value='I explain beginner programming concepts with small examples and guided practice.';document.getElementById('mentor-experience').value='I have built several Python projects and helped classmates understand functions.';document.getElementById('mentor-portfolio').value='https://example.com/portfolio';document.getElementById('mentor-outline').value='Start with a small example, let the learner explain it, then guide an exercise.';document.getElementById('mentor-agreement').checked=true;document.getElementById('mentor-topics').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Application is pending and session creation is unavailable' (Eval "peerMentoringStore.application().status==='Pending' && !document.getElementById('peer-title')")
    Logout
    Open 'pages/admin/admin-peer-mentoring.html'
    Check 'Mentor reviews require admin sign in' (Eval "location.pathname.endsWith('/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 600
    Check 'Admin sign in returns to the review queue' (Eval "location.pathname.endsWith('/admin-peer-mentoring.html') && peerMentoringStore.applications().length===1")
    Eval "document.querySelector('[id^=feedback-]').value='Reviewed the project and the beginner teaching plan.';document.querySelector('[id^=feedback-]').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Admin can approve with review feedback' (Eval "peerMentoringStore.applications()[0].status==='Approved'")
    Shot 'admin-review'
    Logout
    SignIn 'mentor@example.com'
    Check 'Registered mentor can sign in again after logout' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-session')).email==='mentor@example.com'")
    Open 'pages/student/mentor-studio.html'
    Check 'Approved mentor sees session publishing controls' (Eval "document.getElementById('peer-title')!==null && document.body.textContent.includes('Approved')")
    Eval "document.getElementById('peer-title').value='Understand Python functions';document.getElementById('peer-description').value='Explore parameters and return values with small examples and exercises.';document.getElementById('peer-outcome').value='Write and explain one simple function independently.';document.getElementById('peer-requirements').value='Basic variables and a browser.';document.getElementById('peer-price').value='12';document.getElementById('peer-title').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Session begins as a private draft' (Eval "peerMentoringStore.ownSessions()[0].status==='Draft' && peerMentoringStore.publicSessions().length===0")
    Eval "const d=new Date(Date.now()+3*3600000);document.querySelector('input[type=datetime-local]').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);document.querySelector('input[type=datetime-local]').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Eval "[...document.querySelectorAll('button')].find(b=>b.textContent==='Publish session').click();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Published approved session appears with a future appointment' (Eval "peerMentoringStore.publicSessions().length===1 && peerMentoringStore.publicSessions()[0].slots[0].available")
    $listing=Eval "peerMentoringStore.publicSessions()[0].id"
    Shot 'mentor-studio'
    Logout
    SignUp 'Beginner Student' 'learner@example.com'
    Open 'pages/services/peer-mentoring.html'
    Check 'Learner can discover the mentor session' (Eval "document.querySelector('.peer-session-card h3').textContent==='Understand Python functions'")
    Shot 'catalogue'
    Open ('pages/services/mentoring-details.html?id='+$listing)
    Eval "document.getElementById('peer-slot').selectedIndex=1;document.getElementById('peer-booking-notes').value='Please help me understand parameters and return values.';document.getElementById('peer-slot').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Booking is requested without automatic confirmation or payment' (Eval "peerMentoringStore.mine()[0].status==='Requested' && peerMentoringStore.mine()[0].meetingUrl==='' && document.querySelector('.peer-success')")
    Open 'pages/student/requests.html#booking-history'
    Check 'New peer bookings appear in the existing requests tracker' (Eval "document.querySelector('#booking-history .peer-booking-card') && document.querySelector('#booking-history-tab .request-tab-count').textContent==='1'")
    Logout
    SignIn 'mentor@example.com'
    Open 'pages/student/mentor-studio.html'
    Check 'Mentor can see the learner request and its notes' (Eval "document.querySelector('.peer-booking-card').textContent.includes('Beginner Student') && document.querySelector('[id^=meeting-]')")
    Eval "document.querySelector('[id^=meeting-]').value='https://meet.google.com/test-session';document.querySelector('[id^=meeting-]').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Mentor confirmation saves the provided meeting link' (Eval "peerMentoringStore.mine()[0].status==='Confirmed' && peerMentoringStore.mine()[0].meetingUrl==='https://meet.google.com/test-session'")
    Logout
    Open 'pages/auth/login.html'
    Eval "document.getElementById('email').value='learner@example.com';document.getElementById('password').value='WrongPassword123!';document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Wrong passwords cannot reopen a registered student account' (Eval "location.pathname.endsWith('/login.html') && document.getElementById('login-message').classList.contains('is-error') && cmStorage.getItem('codementor-demo-session')===null")
    SignIn 'learner@example.com'
    Open 'pages/student/requests.html#booking-history'
    Check 'Returning learner sees confirmation and one meeting link' (Eval "document.querySelector('#booking-history .peer-booking-card .peer-status').textContent==='Confirmed' && [...document.querySelectorAll('#booking-history .peer-booking-card a')].filter(a=>a.href.startsWith('https://meet.google.com')).length===1")
    Check 'Passwords are stored only as derived credentials' (Eval "!localStorage.getItem('codementor-student-accounts-v1').includes('LocalStudent123!') && !cmStorage.getItem('codementor-demo-session').includes('credential')")
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    Shot 'confirmed-booking'
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$false} | Out-Null
    Eval "document.documentElement.dataset.theme='dark';true" | Out-Null
    Check 'Mobile bookings have no horizontal overflow' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Shot 'confirmed-booking-mobile'
    Eval "const testNow=Date.now()+5*3600000;Date.now=()=>testNow;window.dispatchEvent(new CustomEvent('peer-mentoring-refresh'));true" | Out-Null
    Eval "[...document.querySelectorAll('#booking-history button')].find(b=>b.textContent==='Mark session completed').click();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'After the simulated scheduled end the learner can complete the session' (Eval "peerMentoringStore.mine()[0].status==='Completed'")
    Eval "document.querySelector('[id^=rating-]').value='5';document.querySelector('[id^=review-]').value='Clear explanations and helpful examples.';document.querySelector('[id^=rating-]').form.requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 300
    Check 'Completed session accepts a single learner review' (Eval "peerMentoringStore.mine()[0].review.rating===5 && !document.querySelector('[id^=rating-]')")
    Check 'Public catalogue shows an aggregate rating without participant emails' (Eval "peerMentoringStore.publicSessions()[0].rating===5 && !JSON.stringify(peerMentoringStore.publicSessions()).includes('@')")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
