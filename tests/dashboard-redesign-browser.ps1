# Student dashboard / My progress redesign: screenshots and browser checks.
#   -Phase before   only screenshots (used once before the redesign)
#   -Phase after    screenshots + checks
param([ValidateSet('before','after')][string]$Phase = 'after')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$evidence = Join-Path $root 'docs/evidence'
New-Item -ItemType Directory -Force $evidence | Out-Null
$profile = Join-Path $env:TEMP ('cm-dashboard-' + [guid]::NewGuid().ToString('N'))
$server = Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-server.ps1'),'-Port','8877') -WindowStyle Hidden -PassThru
$chrome = Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    for ($attempt=0; $attempt -lt 50; $attempt++) { try { Invoke-WebRequest 'http://127.0.0.1:8877/index.html' -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 100 } }
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $target = (Invoke-RestMethod "http://127.0.0.1:$port/json") | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0
    function Cdp($method,$parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        do { $response=$socket.Receive()|ConvertFrom-Json } while ($response.id -ne $id)
        if ($response.error) { throw ($response.error|ConvertTo-Json) }
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    function Open($path) { $n = Cdp 'Page.navigate' @{url=('http://127.0.0.1:8877/' + $path)}; if ($n.errorText) {throw $n.errorText}; Start-Sleep -Milliseconds 900 }
    function Check($name,$passed) { if (!$passed) {throw "FAIL $name"}; Write-Output "PASS $name" }
    function Size($w,$h) { Cdp 'Emulation.setDeviceMetricsOverride' @{width=$w;height=$h;deviceScaleFactor=1;mobile=($w -lt 600)} | Out-Null; Start-Sleep -Milliseconds 300 }
    function Shot($name) { $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}; [IO.File]::WriteAllBytes((Join-Path $evidence "$name.png"),[Convert]::FromBase64String($shot.data)) }
    Cdp 'Runtime.enable' @{} | Out-Null
    Open 'index.html'
    Eval 'localStorage.clear();sessionStorage.clear();true' | Out-Null
    Open 'pages/auth/login.html'
    Eval "document.getElementById('fill-demo').click();document.getElementById('login-form').requestSubmit();true" | Out-Null
    Start-Sleep -Milliseconds 900
    # Real-shaped progress for the sample account: 4 lessons, 1 passed task, a quiz and dated activity.
    Eval "(()=>{const d=n=>new Date(Date.now()-n*86400000).toISOString();cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-language',JSON.stringify('python'));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:['variables','data-types','input-output','numbers'],tasks:['student-profile'],assessments:{'1':{score:75,lastScore:75,submittedAt:d(1)}},checks:{variables:{correct:true,answer:0,checkedAt:d(3)},'data-types':{correct:false,answer:1,checkedAt:d(2)},numbers:{correct:true,answer:0,checkedAt:d(0)}},taskResults:{'student-profile':{passed:3,total:3,cases:[],submittedAt:d(1)},receipt:{passed:1,total:3,cases:[{passed:false,expected:'Total: 5',output:'Total: 4'}],submittedAt:d(0)}}}));return true})()" | Out-Null
    foreach ($size in @(@{w=1440;h=1000},@{w=390;h=844})) {
        Size $size.w $size.h
        Open 'pages/student/dashboard.html'
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        Shot "dashboard-$Phase-$($size.w)"
        Open 'pages/student/progress.html'
        Eval "document.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();true" | Out-Null
        Shot "progress-$Phase-$($size.w)"
    }
    if ($Phase -eq 'after') {
        foreach ($w in @(1440,1024,768,390)) {
            Size $w 900
            Open 'pages/student/dashboard.html'
            Check "Dashboard $w px has no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth')
            Open 'pages/student/progress.html'
            Check "My progress $w px has no horizontal scroll" (Eval 'document.documentElement.scrollWidth<=innerWidth')
        }
        Size 1440 1000
        Open 'pages/student/dashboard.html'
        Check 'Exactly one Continue action on the dashboard' (Eval "[...document.querySelectorAll('main a, main button')].filter(n=>/^\s*continue\b/i.test(n.textContent)&&n.offsetParent!==null).length===1")
        Check 'Four KPI tiles render real numbers' (Eval "document.querySelectorAll('.kpi-tile').length===4 && document.getElementById('recorded-lessons').textContent.startsWith('4 / ')")
        Check 'Progress ring shows the overall lesson percentage' (Eval "document.querySelector('.ring-value').textContent===Math.round(4/pythonCurriculum.allLessons.length*100)+'%'")
        Check 'Weekly chart has seven days with tooltips' (Eval "document.querySelectorAll('#week-chart .week-col').length===7 && [...document.querySelectorAll('#week-chart .week-col')].every(c=>c.getAttribute('aria-label'))")
        Check 'Recent activity lists real events' (Eval "document.querySelectorAll('#recent-activity li').length>=1 && document.querySelectorAll('#recent-activity li').length<=5")
        Check 'Suggested next is labelled as a system suggestion' (Eval "document.getElementById('suggested-next').textContent.includes('System suggestion')")
        # Language switcher keyboard behaviour
        Eval "document.querySelector('.workspace-topbar .lang-switch-button').focus();true" | Out-Null
        Eval "document.querySelector('.workspace-topbar .lang-switch-button').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));true" | Out-Null
        Check 'Switcher opens from the keyboard with aria-expanded and an active option' (Eval "(()=>{const b=document.querySelector('.workspace-topbar .lang-switch-button'),l=document.getElementById(b.getAttribute('aria-controls'));return b.getAttribute('aria-expanded')==='true'&&!l.hidden&&!!l.getAttribute('aria-activedescendant')&&document.activeElement===l})()")
        Eval "document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true" | Out-Null
        Check 'Escape closes the switcher and returns focus' (Eval "(()=>{const b=document.querySelector('.workspace-topbar .lang-switch-button');return b.getAttribute('aria-expanded')==='false'&&document.activeElement===b})()")
        Eval "document.querySelector('.workspace-topbar .lang-switch-button').click();document.querySelector('.workspace-topbar [role=option][data-language=javascript]').click();true" | Out-Null
        Start-Sleep -Milliseconds 1200
        Check 'Picking JavaScript switches immediately and confirms with a toast' (Eval "cmStorage.activeLanguage()==='javascript' && document.querySelector('.cm-toast')?.textContent.includes('Switched to JavaScript. Your Python progress is saved.')")
        Check 'JavaScript dashboard never shows Python numbers' (Eval "document.getElementById('recorded-lessons').textContent==='0 / '+pythonCurriculum.allLessons.length && pythonCurriculum.id==='javascript'")
        Shot "dashboard-after-1440-javascript"
        Eval "document.querySelector('.workspace-topbar .lang-switch-button').click();document.querySelector('.workspace-topbar [role=option][data-language=rust]').click();true" | Out-Null
        Start-Sleep -Milliseconds 300
        Check 'Coming-soon language opens the availability panel without switching' (Eval "cmStorage.activeLanguage()==='javascript' && document.querySelector('dialog.lang-availability[open]')?.textContent.includes('Notify me')")
        Eval "document.querySelector('dialog.lang-availability[open] .lang-availability-close').click();true" | Out-Null
        Open 'pages/student/progress.html'
        Check 'My progress shows the badge gallery and the visual roadmap' (Eval "document.querySelectorAll('.badge-card svg').length>0 && document.querySelectorAll('.roadmap-node').length===pythonCurriculum.levels.length")
        Check 'Bookings and service requests are reachable from My progress' (Eval "!!document.getElementById('booking-count') && !!document.querySelector('a[href$=""requests.html""]')")
    }
} finally {
    if ($socket) {$socket.Dispose()}
    foreach($process in @($chrome,$server)) {if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}}
}
