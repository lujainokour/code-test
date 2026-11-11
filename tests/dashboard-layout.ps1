$ErrorActionPreference = 'Stop'
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
    $script:jsErrors=@()
    $checks=@()
    Cdp 'Runtime.enable' @{} | Out-Null
    Cdp 'Page.enable' @{} | Out-Null
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=('http://127.0.0.1:8893/'+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Demo Student (SAMPLE)',email:'layout@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types'],tasks:[],assessments:{}}));true"|Out-Null
    Go 'pages/student/dashboard.html'
    Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true"|Out-Null
    Start-Sleep -Milliseconds 100
    foreach($size in @(@(1366,768),@(1440,900),@(1280,720),@(1093,614),@(1024,768),@(390,844))){
      $width=$size[0];$height=$size[1]
      Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=$height;deviceScaleFactor=1;mobile=($width -lt 901)}|Out-Null
      Start-Sleep -Milliseconds 180
      Check "$width x $height : page fits horizontally" (Eval 'document.documentElement.scrollWidth<=innerWidth')
      if($width -gt 900){
        Check "$width x $height : primary links and footer fit without sidebar scrolling" (Eval "(()=>{const s=document.querySelector('.workspace-sidebar'),n=document.querySelector('.workspace-navigation'),b=document.querySelector('.sidebar-bottom');return s.scrollHeight<=s.clientHeight+1&&n.scrollHeight<=n.clientHeight+1&&b.getBoundingClientRect().bottom<=innerHeight})()")
        Check "$width x $height : six primary destinations remain visible" (Eval "(()=>{const links=[...document.querySelectorAll('.shell-nav-group:first-child a')];return links.length===6&&links.every(a=>{const r=a.getBoundingClientRect();return r.height>=38&&r.bottom<innerHeight})})()")
      }
      if($width -in @(1366,1280,390)){
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path (Split-Path $PSScriptRoot) "previews/dashboard-layout-$width.png"),[Convert]::FromBase64String($shot.data))
      }
    }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1366;height=768;deviceScaleFactor=1;mobile=$false}|Out-Null
    Check 'Secondary destinations are grouped and collapsed by default' (Eval "document.querySelectorAll('.workspace-navigation details').length===3&&document.querySelectorAll('.workspace-navigation details[open]').length===0")
    Eval "document.querySelector('.workspace-navigation summary').click();true"|Out-Null
    Check 'Resource group expands with a native keyboard-accessible control' (Eval "document.querySelector('.workspace-navigation details').open&&document.querySelector('.workspace-navigation details a').getBoundingClientRect().height>0")
    Go 'pages/student/skill-analysis.html'
    Check 'Current page automatically opens its navigation group' (Eval "!!document.querySelector('details[open] a[aria-current=page]')")
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}|Out-Null
    Eval "document.getElementById('workspace-menu-toggle').click();true"|Out-Null
    Check 'Mobile navigation opens' (Eval "document.querySelector('.workspace-sidebar').classList.contains('is-open')")
    Eval "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));true"|Out-Null
    Check 'Escape closes mobile navigation and restores focus' (Eval "!document.querySelector('.workspace-sidebar').classList.contains('is-open')&&document.activeElement.id==='workspace-menu-toggle'")
    Check 'No uncaught JavaScript exceptions' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/dashboard-layout-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}
