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
    Open 'pages/services/community.html'
    Check 'Community requires student login' (Eval "location.pathname.endsWith('/auth/login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 800
    Check 'Non-members see channel directory with no private posts or composer' (Eval "document.querySelectorAll('#community-directory article').length===4 && document.querySelectorAll('.community-post').length===0 && document.getElementById('community-composer').hidden")
    Check 'Membership check denies direct entry' (Eval "(()=>{try{communityMembership.assertMember('questions');return false}catch{return true}})()")
    Eval "document.querySelector('#community-directory button').click();document.getElementById('join-reason').value='I want to discuss lesson questions with my study group.';document.querySelector('#community-access form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Pending request keeps discussions private' (Eval "communityMembership.state('questions')==='pending' && document.querySelectorAll('.community-post').length===0 && document.getElementById('community-composer').hidden")
    Check 'Duplicate join request is rejected' (Eval "communityMembership.request('questions','Another request').then(()=>false,()=>true)")
    Check 'Student cannot approve their own request' (Eval "communityMembership.decide(JSON.parse(localStorage.getItem(communityMembership.key)).requests[0].id,'approved').then(()=>false,()=>true)")
    $studentSocket = $socket
    $newTab=Cdp 'Target.createTarget' @{url='http://127.0.0.1:8876/pages/admin/admin-community.html'}
    Start-Sleep -Milliseconds 600
    $adminTarget=(Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.id -eq $newTab.targetId}
    $adminSocket=New-Object CdpSocket($adminTarget.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $socket=$adminSocket
    Check 'Admin membership page is protected' (Eval "location.pathname.endsWith('/auth/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 700
    Check 'Admin login returns to the request queue' (Eval "location.pathname.endsWith('/admin-community.html') && document.querySelectorAll('#membership-requests article').length===1")
    Eval "document.querySelector('#membership-requests button').click();true" | Out-Null
    Start-Sleep -Milliseconds 200
    $socket=$studentSocket
    Check 'Approval opens discussion in student tab without reloading' (Eval "communityMembership.state('questions')==='approved' && !document.getElementById('community-composer').hidden && document.querySelectorAll('.community-post').length===1")
    Eval "Array.from(document.querySelectorAll('#community-channels button')).find(b=>b.textContent==='Study notes').click();true" | Out-Null
    Check 'Approval for one channel does not unlock other channels' (Eval "document.getElementById('community-composer').hidden && document.querySelectorAll('.community-post').length===0 && !!document.getElementById('join-reason')")
    Eval "document.getElementById('join-reason').value='I want to exchange study notes.';document.querySelector('#community-access form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 150
    $socket=$adminSocket
    Check 'New requests arrive in admin tab without reloading' (Eval "document.querySelectorAll('#membership-requests article').length===1")
    Eval "document.querySelector('#membership-requests button:nth-child(2)').click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    $socket=$studentSocket
    Check 'Declined request stays locked and allows reapplication' (Eval "communityMembership.state('notes')==='rejected' && !!document.getElementById('join-reason') && document.getElementById('community-composer').hidden")
    Eval "document.getElementById('join-reason').value='Updated reason for joining notes.';document.querySelector('#community-access form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Eval "document.querySelector('#community-access button').click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Pending request can be cancelled' (Eval "communityMembership.state('notes')==='cancelled'")
    Eval "Array.from(document.querySelectorAll('#community-channels button')).find(b=>b.textContent==='Questions & help').click();document.getElementById('post-title').value='How do Python loops work?';document.getElementById('post-body').value='<img src=x onerror=alert(1)> Can someone explain iteration?';document.getElementById('community-composer').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 200
    Check 'Approved member publishes safely inside the channel' (Eval "document.querySelector('.community-post h3').textContent==='How do Python loops work?' && !document.querySelector('.community-post img')")
    Eval "document.querySelector('.community-post-actions button:nth-child(2)').click();document.querySelector('.community-post textarea').value='Each iteration runs the loop body once.';document.querySelector('.community-post form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Approved member can reply' (Eval "document.querySelector('.community-reply-body').textContent.includes('iteration')")
    Eval "document.querySelector('.community-post-actions button:nth-child(3)').click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Open 'pages/services/community.html'
    Check 'Membership and saved discussion persist after reload' (Eval "communityMembership.state('questions')==='approved' && document.querySelectorAll('.community-post').length===2")
    Eval "document.getElementById('community-search').value='How do Python';document.getElementById('community-search').dispatchEvent(new Event('input'));true" | Out-Null
    Check 'Search only finds accessible posts' (Eval "document.querySelectorAll('.community-post').length===1")
    Eval "document.getElementById('community-search').value='';document.getElementById('community-search').dispatchEvent(new Event('input'));true" | Out-Null
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Other Student',email:'community-other@example.com',role:'student',isDemo:true}));true" | Out-Null
    Open 'pages/services/community.html'
    Check 'Another student cannot inherit approved membership or saved posts' (Eval "communityMembership.state('questions')==='none' && document.querySelectorAll('.community-post').length===0 && document.getElementById('community-composer').hidden")
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Demo Student',email:'student@example.com',role:'student',isDemo:true}));true" | Out-Null
    Open 'pages/services/community.html'
    foreach($size in @(@{w=1440;h=1050},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        foreach($theme in @('light','dark')) {
            Eval "document.documentElement.dataset.theme='$theme';document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
            Start-Sleep -Milliseconds 100
            Check "$($size.w)/$theme has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
            [IO.File]::WriteAllBytes((Join-Path $root ('docs/community-'+$size.w+'-'+$theme+'.png')),[Convert]::FromBase64String($shot.data))
        }
    }
    Eval "window.staleHelpful=document.querySelector('.community-post-actions button');true" | Out-Null
    $socket=$adminSocket
    Eval "document.getElementById('membership-filter').value='approved';document.getElementById('membership-filter').dispatchEvent(new Event('change'));true" | Out-Null
    Check 'Admin sees approved members separately' (Eval "document.querySelectorAll('#membership-requests article').length===1")
    Eval "document.querySelector('#membership-requests button').click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    $socket=$studentSocket
    Check 'Removing membership immediately clears private content in another tab' (Eval "communityMembership.state('questions')==='revoked' && document.querySelectorAll('.community-post').length===0 && document.getElementById('community-composer').hidden")
    Eval "window.beforePosts=localStorage.getItem('codementor-community-v1');staleHelpful.click();true" | Out-Null
    Start-Sleep -Milliseconds 150
    Check 'Stale discussion actions cannot bypass revoked access' (Eval "window.beforePosts===localStorage.getItem('codementor-community-v1') && document.getElementById('community-status').textContent.includes('approval')")
    Check 'Former member cannot enter directly after revocation' (Eval "(()=>{try{communityMembership.assertMember('questions');return false}catch{return true}})()")
    Eval "localStorage.setItem(communityMembership.key,'broken-records');true" | Out-Null
    Open 'pages/services/community.html'
    Check 'Corrupt membership records fail closed without being overwritten' (Eval "localStorage.getItem(communityMembership.key)==='broken-records' && document.querySelectorAll('.community-post').length===0 && document.getElementById('community-composer').hidden && document.getElementById('community-status').textContent.includes('Access is locked')")
    $socket=$adminSocket
    Eval "sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()-9*3600000}));true" | Out-Null
    Check 'Expired admin session cannot review requests' (Eval "(()=>{try{communityMembership.requests();return false}catch{return true}})()")
} finally {
    foreach($connection in @($studentSocket,$adminSocket)) {if($connection){$connection.Dispose()}}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
