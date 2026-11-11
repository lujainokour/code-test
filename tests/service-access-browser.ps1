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
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    foreach ($page in @('community','peer-mentoring','showcase','freelance-services')) {
        Open 'index.html'
        Check "Homepage $page card explains sign in" (Eval "document.querySelector('[data-service-target=`"pages/services/$page.html`"] .service-access-note').textContent==='Sign in required'")
        Eval "document.querySelector('[data-service-target=`"pages/services/$page.html`"]').click();true" | Out-Null
        Start-Sleep -Milliseconds 600
        Check "Homepage $page card opens sign in with its destination" (Eval "location.pathname.endsWith('/auth/login.html') && new URLSearchParams(location.search).get('next')==='pages/services/$page.html'")
        Check "Create account keeps $page destination" (Eval "new URL(document.querySelector('a[href*=`"signup.html`"]').href).searchParams.get('next').endsWith('/pages/services/$page.html')")
        Open "pages/services/$page.html"
        Check "Guest is redirected from $page" (Eval "location.pathname.endsWith('/auth/login.html') && new URLSearchParams(location.search).get('next')==='pages/services/$page.html'")
    }
    Open 'pages/student/dashboard.html'
    Check 'Direct dashboard URL requires sign in' (Eval "location.pathname.endsWith('/auth/login.html')")
    Open 'pages/auth/signup.html?next=pages%2Fservices%2Fshowcase.html'
    Check 'Signup keeps destination when returning to sign in' (Eval "new URL(document.querySelector('a[href*=`"login.html`" ]').href).searchParams.get('next').endsWith('/pages/services/showcase.html') && document.getElementById('signup-submit').textContent==='Create account and continue'")
    Open 'pages/services/peer-mentoring.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 700
    Check 'Successful sign in returns to requested service with student identity' (Eval "location.pathname.endsWith('/services/peer-mentoring.html') && document.body.classList.contains('shell-active') && document.getElementById('account-name').textContent==='Lujain Okour'")
    Open 'index.html'
    Check 'Signed in cards open their own services' (Eval "[...document.querySelectorAll('[data-service-target]')].every(a=>a.href.endsWith(a.dataset.serviceTarget)&&a.querySelector('.service-access-note').textContent==='Open service')")
    Open 'pages/services/peer-mentoring.html'
    Eval "document.getElementById('logout-button').click();true" | Out-Null
    Start-Sleep -Milliseconds 600
    Check 'Logout clears student identity' (Eval "location.pathname.endsWith('/auth/login.html') && cmStorage.getItem('codementor-demo-session')===null")
    Eval 'history.back();true' | Out-Null
    Start-Sleep -Milliseconds 700
    Check 'Back cannot reopen student service after logout' (Eval "location.pathname.endsWith('/auth/login.html')")
    Eval "localStorage.setItem('codementor-company-session',JSON.stringify({role:'company',isDemo:true,name:'Test Company',email:'company@example.com'}));true" | Out-Null
    Open 'pages/services/freelance-services.html'
    Check 'Company sees its own workspace link without student shell' (Eval "!document.body.classList.contains('shell-active') && document.querySelector('.nav-actions a').textContent==='Company workspace'")
    Open 'pages/student/dashboard.html'
    Check 'Company identity cannot enter student dashboard' (Eval "location.pathname.endsWith('/auth/login.html')")
    Check 'External next parameter is rejected' (Eval "cmAccess.returnTarget('https://evil.example/pages/student/dashboard.html')===null")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
