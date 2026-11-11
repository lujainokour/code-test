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
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 650
    Open 'pages/student/requests.html'
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
    Check 'Four labelled request tabs show only one panel' (Eval "document.querySelectorAll('[role=tab]').length===4 && document.querySelectorAll('.request-tab-panel:not([hidden])').length===1")
    Check 'The empty panel provides a clear next action' (Eval "document.querySelector('.request-tab-panel:not([hidden]) .request-empty a').href.includes('peer-mentoring.html')")
    Check 'The workspace has exactly one compact footer outside main' (Eval "document.querySelectorAll('.workspace-body > footer').length===1 && document.querySelector('.workspace-app-footer').parentElement.classList.contains('workspace-body') && !document.querySelector('main footer')")
    Eval "document.getElementById('booking-history-tab').click();true" | Out-Null
    Check 'Clicking a tab switches panel and preserves a direct-link fragment' (Eval "!document.getElementById('booking-history').hidden && location.hash==='#booking-history' && document.getElementById('booking-history-tab').getAttribute('aria-selected')==='true'")
    Eval "document.getElementById('booking-history-tab').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));true" | Out-Null
    Check 'Keyboard arrows switch tabs and move focus' (Eval "!document.getElementById('request-history').hidden && document.activeElement.id==='request-history-tab'")
    Eval "const record=studentServicesStore.save('booking',{mentorId:studentServicesData.mentors[0].id,slot:'layout-test-slot',notes:'Layout regression test',status:'local-simulation'},'student@example.com');sessionStorage.setItem('layout-record',record.id);true" | Out-Null
    Open 'pages/student/requests.html#booking-history'
    Check 'Saved records remain visible with accurate tab counts' (Eval "document.querySelector('#booking-history-tab .request-tab-count').textContent==='1' && document.querySelectorAll('#booking-history .request-record').length===1 && !document.querySelector('#booking-history .request-empty')")
    $record=Eval "sessionStorage.getItem('layout-record')"
    Open ('pages/student/requests.html#booking-'+$record)
    Check 'Existing individual-record deep links open their containing tab' (Eval "!document.getElementById('booking-history').hidden && document.getElementById('booking-'+sessionStorage.getItem('layout-record'))!==null")
    foreach($size in @(@{w=1440;h=1000},@{w=768;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        foreach($theme in @('light','dark')) {
            Eval "document.documentElement.dataset.theme='$theme';document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();document.getElementById('instructor-bookings-tab').click();window.scrollTo(0,0);true" | Out-Null
            Start-Sleep -Milliseconds 150
            Check "$($size.w)/$theme has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            Check "$($size.w)/$theme footer follows content without overlap" (Eval "(()=>{const f=document.querySelector('.workspace-app-footer').getBoundingClientRect(),m=document.querySelector('main').getBoundingClientRect();return f.top>=m.bottom-1 && f.height<180})()")
            Check "$($size.w)/$theme shows one request panel" (Eval "document.querySelectorAll('.request-tab-panel:not([hidden])').length===1")
            $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
            [IO.File]::WriteAllBytes((Join-Path $root ('docs/requests-layout-'+$size.w+'-'+$theme+'.png')),[Convert]::FromBase64String($shot.data))
        }
    }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
    foreach($page in @('pages/student/dashboard.html','pages/services/community.html','pages/teacher/teacher-dashboard.html','pages/company/company-dashboard.html')) {
        Open $page
        Check "$page has one shared footer" (Eval "document.querySelectorAll('.workspace-body > footer').length===1 && document.querySelector('.workspace-app-footer')!==null")
        Check "$page has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
    }
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
