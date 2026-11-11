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
    Open 'pages/admin/admin-companies.html'
    Check 'Company directory requires admin sign in' (Eval "location.pathname.endsWith('/admin-login.html')")
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Admin sign in returns to Companies' (Eval "location.pathname.endsWith('/admin-companies.html')")
    Check 'An empty directory does not create a sample company' (Eval "document.body.textContent.includes('No company profile saved yet') && localStorage.getItem('codementor-company-store-v1')===null")
    Eval "const company={profile:{name:'Atlas Software',email:'team@atlas.example',industry:'Software',phone:'+962 000000000',location:'Amman',website:'https://atlas.example',size:'10-20',about:'Student project opportunities.',localCredential:{hash:'private-test-hash',salt:'private-test-salt'}},opportunities:[{id:'one',title:'Python internship',type:'Internship',status:'Active'},{id:'two',title:'Previous project',type:'Project',status:'Closed'}],applications:[],messages:[],talentPool:[]};localStorage.setItem('codementor-company-store-v1',JSON.stringify(company));sessionStorage.setItem('original-company-data',JSON.stringify(company));window.dispatchEvent(new Event('pageshow'));true" | Out-Null
    Check 'Saved company identity and actual opportunity counts are shown' (Eval "document.querySelector('.admin-company-card h2').textContent==='Atlas Software' && document.querySelector('#admin-companies-content > p').textContent.includes('1 active opportunities') && document.querySelectorAll('.admin-company-card .overview-list-row').length===2")
    Eval "const saved=JSON.parse(localStorage.getItem('codementor-company-store-v1'));Object.assign(saved.opportunities[0],{department:'Engineering',location:'Remote',duration:'Three months',stipend:'300 JOD',description:'Build a tested Python project.',skillsRequired:['Python','SQL']});saved.applications.push({id:'connected-one',linkedStudent:true,opportunityId:'one'});localStorage.setItem('codementor-company-store-v1',JSON.stringify(saved));sessionStorage.setItem('original-company-data',JSON.stringify(saved));window.dispatchEvent(new Event('pageshow'));true" | Out-Null
    Check 'Admin sees expanded opportunity details and connected application count' (Eval "const row=document.querySelector('.admin-company-card .overview-list-row');row.querySelector('details').open=true;['Engineering','Remote','Three months','300 JOD','Python, SQL','Build a tested Python project.'].every(text=>row.textContent.includes(text)) && companyStore.getAdminSnapshot().opportunities[0].connectedApplications===1")
    Check 'Private credentials never enter the admin directory response or markup' (Eval "!JSON.stringify(companyStore.getAdminSnapshot()).includes('private-test')&&!document.body.textContent.includes('private-test')")
    Check 'Opening the directory never edits company records' (Eval "localStorage.getItem('codementor-company-store-v1')===sessionStorage.getItem('original-company-data')")
    Eval "document.getElementById('company-search').value='not-a-match';document.getElementById('company-search').dispatchEvent(new Event('input'));true" | Out-Null
    Check 'Directory search filters the company' (Eval "document.querySelector('.admin-company-card').hidden")
    Eval "document.getElementById('company-search').value='atlas';document.getElementById('company-search').dispatchEvent(new Event('input'));true" | Out-Null
    foreach($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        Check "$($size.w) company directory has no horizontal overflow" (Eval 'document.documentElement.scrollWidth<=innerWidth')
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
        [IO.File]::WriteAllBytes((Join-Path $root ('docs/admin-companies-'+$size.w+'.png')),[Convert]::FromBase64String($shot.data))
    }
    Open 'pages/admin/admin-dashboard.html'
    Check 'Dashboard links to the company directory and shows the saved company' (Eval "[...document.querySelectorAll('#admin-overview-content a')].some(a=>a.href.endsWith('/admin-companies.html'))&&document.getElementById('admin-overview-content').textContent.includes('Atlas Software')")
    Eval "localStorage.setItem('codementor-company-store-v1','{broken');true" | Out-Null
    Open 'pages/admin/admin-companies.html'
    Check 'Unreadable company records show an error and remain untouched' (Eval "document.querySelector('#admin-companies-content .services-notice')!==null&&localStorage.getItem('codementor-company-store-v1')==='{broken'")
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
