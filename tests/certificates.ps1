param([string]$BaseUrl = "http://127.0.0.1:8899/")
$ErrorActionPreference = 'Stop'
# Screenshots and the print-test PDF go to docs/evidence/ (created if missing).
$evidence = Join-Path (Split-Path $PSScriptRoot) 'docs/evidence'
New-Item -ItemType Directory -Force $evidence | Out-Null
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--no-sandbox','--disable-software-rasterizer','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence=0
    function Cdp($method,$parameters) {
        $script:sequence++; $id=$script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do {
            $response=$socket.Receive()|ConvertFrom-Json
            if ($response.method -eq 'Runtime.exceptionThrown') { $script:jsErrors += $response.params.exceptionDetails }
        } while ($response.id -ne $id)
        if ($response.error) {throw ($response.error|ConvertTo-Json)}
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    $script:jsErrors=@();$checks=@()
    Cdp 'Runtime.enable' @{}|Out-Null
    Cdp 'Page.enable' @{}|Out-Null
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=($BaseUrl+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Student Example',email:'certificate-test@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/certificates.html'
    Check 'Incomplete students see a locked preview' (Eval "document.getElementById('print-certificate').disabled&&document.getElementById('certificate-preview-label').textContent.includes('PREVIEW')")
    Check 'Founder name and title replace team references' (Eval "document.querySelector('.certificate-signature').textContent.includes('Lujain Okour')&&document.querySelector('.certificate-signature').textContent.includes('Founder & Developer')")
    Eval "window.print=()=>{window.printCalls=(window.printCalls||0)+1};document.getElementById('print-certificate').click();true"|Out-Null
    Check 'Locked print button cannot trigger printing' (Eval '!window.printCalls')
    Eval "const p={version:1,lessons:pythonCurriculum.allLessons.map(l=>l.id),tasks:pythonCurriculum.levels.flatMap(l=>l.tasks),assessments:{'1':{score:75,submittedAt:'2026-10-16T10:00:00Z'},'2':{score:100,submittedAt:'2026-10-16T11:00:00Z'},'3':{score:75,submittedAt:'2026-10-16T12:00:00Z'}}};cmStorage.setItem('codementor-demo-learning',JSON.stringify(p));true"|Out-Null
    Check 'Completing course and tasks unlocks the named certificate' (Eval "!document.getElementById('print-certificate').disabled&&document.getElementById('certificate-recipient').textContent==='Student Example'&&!document.getElementById('certificate-preview-label').textContent.includes('PREVIEW')")
    Check 'Date is based on recorded activity rather than a fabricated date' (Eval "document.getElementById('certificate-date').textContent==='16 October 2026'")
    Eval "document.getElementById('print-certificate').click();true"|Out-Null
    Check 'Print button invokes browser print' (Eval 'window.printCalls===1')
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1366;height=1000;deviceScaleFactor=1;mobile=$false}|Out-Null
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes((Join-Path $evidence 'certificate-live-desktop.png'),[Convert]::FromBase64String($shot.data))
    Cdp 'Emulation.setEmulatedMedia' @{media='print'}|Out-Null
    Check 'Print layout excludes navigation and actions' (Eval "getComputedStyle(document.querySelector('.workspace-sidebar')).display==='none'&&getComputedStyle(document.querySelector('.certificate-readiness')).display==='none'")
    $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
    [IO.File]::WriteAllBytes((Join-Path $evidence 'certificate-print-layout.png'),[Convert]::FromBase64String($shot.data))
    Check 'Printed footer and signature fit inside the certificate border' (Eval "(()=>{const sheet=document.querySelector('.certificate-document'),label=document.getElementById('certificate-preview-label');return label.getBoundingClientRect().bottom<sheet.getBoundingClientRect().bottom&&sheet.scrollHeight<=sheet.clientHeight+1})()")
    $pdf=Cdp 'Page.printToPDF' @{printBackground=$true;preferCSSPageSize=$true;displayHeaderFooter=$false}
    [IO.File]::WriteAllBytes((Join-Path $evidence 'certificate-print-test.pdf'),[Convert]::FromBase64String($pdf.data))
    Cdp 'Emulation.setEmulatedMedia' @{media='screen'}|Out-Null
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}|Out-Null
    Check 'Certificate preview fits a phone viewport' (Eval 'document.documentElement.scrollWidth<=innerWidth')
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'A Very Long Student Name For Certificate Layout Testing',email:'certificate-test@example.com',role:'student',isDemo:true}));dispatchEvent(new Event('pageshow'));true"|Out-Null
    Check 'Long student names remain inside the certificate' (Eval "(()=>{const n=document.getElementById('certificate-recipient'),s=document.querySelector('.certificate-document');return n.getBoundingClientRect().right<=s.getBoundingClientRect().right&&n.scrollWidth<=n.clientWidth+1})()")
    Eval "cmStorage.setItem('codementor-demo-learning','{broken');true"|Out-Null
    Check 'Malformed records disable printing and are preserved' (Eval "document.getElementById('print-certificate').disabled&&cmStorage.getItem('codementor-demo-learning')==='{broken'")
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/certificate-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}