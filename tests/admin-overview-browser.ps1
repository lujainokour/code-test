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
    Open 'pages/admin/admin-dashboard.html'
    Check 'Admin overview requires admin sign in' (Eval "location.pathname.endsWith('/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Dashboard contains eight real metrics and eight management shortcuts' (Eval "document.querySelectorAll('.overview-stat').length===8&&document.querySelectorAll('.overview-shortcut').length===8")
    Check 'Empty local records report zero instead of sample activity' (Eval "[...document.querySelectorAll('.overview-stat strong')].every(n=>n.textContent==='0')")
    Eval "const alice={name:'Alice Student',email:'alice@example.com',role:'student',isDemo:true};const bob=platformStore.registerStudent({name:'Bob Student',email:'bob@example.com',role:'student',isDemo:true});platformStore.registerStudent(alice);platformStore.setStatus(bob.id,'suspended');cmStorage.setItem('codementor-demo-session',JSON.stringify(alice));cmStorage.setItem('codementor-demo-admin-course-content',JSON.stringify({version:1,courses:{python:{levels:[{id:'level-1',title:'First level',lessons:[{id:'published',title:'A published lesson',status:'published'},{id:'draft',title:'A draft lesson',status:'draft'}]}]}}}));window.dispatchEvent(new Event('pageshow'));true" | Out-Null
    Check 'Registered and enabled account counts use the live registry' (Eval "document.querySelector('[data-stat=students] strong').textContent==='2'&&document.querySelector('[data-stat=enabled] strong').textContent==='1'")
    Check 'Published and draft lesson counts use saved lesson status' (Eval "document.querySelector('[data-stat=published] strong').textContent==='1'&&document.querySelector('[data-stat=drafts] strong').textContent==='1'")
    Eval "peerMentoringStore.apply({language:'Python',topics:'Python functions',bio:'I explain Python programming with simple examples and guided practice.',experience:'I have built several projects and supported other students with debugging.',portfolio:'https://example.com/project',outline:'Explain a simple example, ask the learner to try it and review their approach.',agreement:true},'alice@example.com').then(()=>true)" | Out-Null
    Check 'New teaching applications update the review count immediately' (Eval "document.querySelector('[data-stat=pending] strong').textContent==='1'&&document.querySelector('.overview-columns').textContent.includes('Alice Student')")
    foreach($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        foreach($theme in @('light','dark')) {
            Eval "document.documentElement.dataset.theme='$theme';document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();window.scrollTo(0,0);true" | Out-Null
            Start-Sleep -Milliseconds 200
            Check "$($size.w)/$theme dashboard has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
            [IO.File]::WriteAllBytes((Join-Path $root ('docs/admin-overview-'+$size.w+'-'+$theme+'.png')),[Convert]::FromBase64String($shot.data))
        }
    }
    Eval "const a=peerMentoringStore.applications()[0];peerMentoringStore.reviewApplication(a.id,'Approved','Reviewed the project and sample teaching plan.',a.revision).then(()=>true)" | Out-Null
    Check 'Review decisions update pending and approved totals' (Eval "document.querySelector('[data-stat=pending] strong').textContent==='0'&&document.querySelector('[data-stat=approved] strong').textContent==='1'")
    Eval "window.validContent=cmStorage.getItem('codementor-demo-admin-course-content');cmStorage.setItem('codementor-demo-admin-course-content','{broken');window.dispatchEvent(new Event('pageshow'));true" | Out-Null
    Check 'Unavailable content does not become a false zero or hide student counts' (Eval "document.querySelector('[data-stat=published] strong').textContent==='Unavailable'&&document.querySelector('[data-stat=students] strong').textContent==='2'&&cmStorage.getItem('codementor-demo-admin-course-content')==='{broken'")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
