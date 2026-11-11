param([string]$BaseUrl = "http://127.0.0.1:8896/")
$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-user-guide-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--no-proxy-server','--no-sandbox','--disable-software-rasterizer','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
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
    Cdp 'Emulation.setFocusEmulationEnabled' @{enabled=$true}|Out-Null
    function Check($name,$pass){$script:checks+=@{name=$name;passed=[bool]$pass};Write-Output "$pass : $name";if(!$pass){throw $name}}
    function Go($path){Cdp 'Page.navigate' @{url=($BaseUrl+$path)}|Out-Null;Start-Sleep -Milliseconds 400}
    function Snapshot { Eval "JSON.stringify({local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)]))})" }
    function Ready { Eval "new Promise(resolve=>{let n=0;const t=setInterval(()=>{if(document.getElementById('cm-user-guide')){clearInterval(t);resolve(true)}else if(n++>60){clearInterval(t);resolve(false)}},50)})" }
    function Shot($name) { $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false};[IO.File]::WriteAllBytes((Join-Path $env:TEMP ($name+'.png')),[Convert]::FromBase64String($shot.data)) }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false}|Out-Null
    Go 'index.html'
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Guide Tester',email:'guide@example.com',role:'student',isDemo:true}));cmStorage.setItem('codementor-demo-onboarding',JSON.stringify({language:'python',experience:'beginner',goal:'foundations'}));cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:[],assessments:{}}));true"|Out-Null
    $baseline=Eval "JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k==='codementor-profile-v1'||k.startsWith('codementor-learning-v1:')).sort(([a],[b])=>a.localeCompare(b))))"
    Go 'pages/student/dashboard.html'
    Check 'Guide loads on student workspace' (Ready)
    Check 'First student visit opens guide' (Eval "document.getElementById('cm-user-guide').open&&document.querySelector('.cm-guide-role').textContent==='Student guide'")
    Check 'Five accessible guide chapters' (Eval "document.querySelectorAll('.cm-guide-stop').length===5&&document.querySelectorAll('.cm-guide-stop[aria-current=step]').length===1")
    Check 'Dialog has accessible name and focus' (Eval "document.getElementById('cm-user-guide').getAttribute('aria-labelledby')==='cm-guide-heading'&&document.activeElement.classList.contains('cm-guide-next')")
    Eval "document.querySelector('.cm-guide-skip').focus();true"|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Tab';code='Tab';windowsVirtualKeyCode=9}|Out-Null
    Check 'Keyboard focus stays within modal' (Eval "document.getElementById('cm-user-guide').contains(document.activeElement)")
    Eval "codeMentorTheme.set('light');true"|Out-Null
    Start-Sleep -Milliseconds 300
    Shot 'cm-guide-student-desktop'
    Check 'Next and back update guide content' (Eval "document.querySelector('.cm-guide-next').click();const t=document.getElementById('cm-guide-step-title').textContent;document.querySelector('.cm-guide-previous').click();t==='See what you already know.'&&document.querySelector('.cm-guide-previous').disabled")
    Check 'Road chapters are clickable' (Eval "document.querySelectorAll('.cm-guide-stop')[3].click();document.getElementById('cm-guide-step-title').textContent==='Make the code your own.'")
    Check 'Destination matches selected chapter' (Eval "document.querySelector('.cm-guide-destination').href.endsWith('/pages/student/practice.html')")
    Check 'Skip dismisses and remembers' (Eval "document.querySelector('.cm-guide-skip').click();!document.getElementById('cm-user-guide').open&&Object.keys(localStorage).some(k=>k.startsWith('codementor-guide-v1:student:'))")
    Go 'pages/student/practice.html'
    Check 'Guide available on another workspace page' (Ready)
    Check 'Guide does not reopen after navigation' (Eval "!document.getElementById('cm-user-guide').open")
    Check 'Guide can be reopened from sidebar' (Eval "document.querySelector('.cm-guide-launcher').click();document.getElementById('cm-user-guide').open&&document.querySelector('.cm-guide-count').textContent==='01 / 05'")
    Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Escape';code='Escape';windowsVirtualKeyCode=27}|Out-Null
    Cdp 'Input.dispatchKeyEvent' @{type='keyUp';key='Escape';code='Escape';windowsVirtualKeyCode=27}|Out-Null
    Start-Sleep -Milliseconds 100
    Check 'Escape dismisses and restores scrolling' (Eval "!document.getElementById('cm-user-guide').open&&document.documentElement.style.overflow===''")
    foreach($size in @(@(390,844),@(375,667),@(844,390))) {
      Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size[0];height=$size[1];deviceScaleFactor=1;mobile=$true}|Out-Null
      Eval "document.querySelector('.cm-guide-launcher').click();true"|Out-Null
      Start-Sleep -Milliseconds 250
      Check "$($size[0])x$($size[1]) dialog fits screen" (Eval "(()=>{const d=document.getElementById('cm-user-guide'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()")
      Check "$($size[0])x$($size[1]) all chapters work" (Eval "[...document.querySelectorAll('.cm-guide-stop')].every((b,i)=>{b.click();return document.querySelector('.cm-guide-count').textContent===String(i+1).padStart(2,'0')+' / 05'})")
      Eval "document.querySelector('.cm-guide-stop').click();true"|Out-Null
      if($size[0] -eq 390){Shot 'cm-guide-student-mobile'}
      Eval "document.querySelector('.cm-guide-close').click();true"|Out-Null
    }
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false}|Out-Null
    Eval "sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()}));true" | Out-Null
    Go 'pages/admin/admin-dashboard.html'
    Check 'Admin guide loads' (Ready)
    Check 'Admin has separate first visit and content' (Eval "document.getElementById('cm-user-guide').open&&document.querySelector('.cm-guide-role').textContent==='Admin guide'&&document.getElementById('cm-guide-step-title').textContent==='See the bigger picture.'")
    Shot 'cm-guide-admin-desktop'
    Check 'Admin student chapter routes correctly' (Eval "document.querySelectorAll('.cm-guide-stop')[3].click();document.querySelector('.cm-guide-destination').href.endsWith('/pages/admin/admin-students.html')")
    Eval "codeMentorTheme.set('dark');document.querySelector('.cm-guide-stop').click();true"|Out-Null
    Start-Sleep -Milliseconds 250
    Shot 'cm-guide-admin-dark'
    Check 'Unsupported dark preference preserves current light dialog surface' (Eval "getComputedStyle(document.getElementById('cm-user-guide')).backgroundColor==='rgb(248, 251, 252)'&&document.documentElement.dataset.theme==='light'")
    Check 'Finish closes the guide' (Eval "document.querySelectorAll('.cm-guide-stop')[4].click();document.querySelector('.cm-guide-next').click();!document.getElementById('cm-user-guide').open")
    Go 'pages/admin/admin-students.html'
    Check 'Admin repeat visit loads guide' (Ready)
    Check 'Admin guide stays dismissed across pages' (Eval "!document.getElementById('cm-user-guide').open")
    Check 'Guide does not change profile or learning records' ((Eval "JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k==='codementor-profile-v1'||k.startsWith('codementor-learning-v1:')).sort(([a],[b])=>a.localeCompare(b))))") -eq $baseline)
    Eval "document.querySelector('.cm-guide-launcher').click();document.querySelectorAll('.cm-guide-stop')[3].click();document.querySelector('.cm-guide-destination').click();true"|Out-Null
    Start-Sleep -Milliseconds 500
    Check 'Destination opens the correct page without repeating guide' (Eval "location.pathname.endsWith('/pages/admin/admin-students.html')&&!document.getElementById('cm-user-guide').open")
    Eval "window.originalStorageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('Blocked for isolated test')};document.querySelector('.cm-guide-launcher').click();document.querySelector('.cm-guide-close').click();true"|Out-Null
    Check 'Guide still dismisses if preference storage is blocked' (Eval "!document.getElementById('cm-user-guide').open")
    Eval "Storage.prototype.setItem=window.originalStorageSetItem;true"|Out-Null
    Eval "cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Another Student',email:'other-guide@example.com',role:'student',isDemo:true}));true"|Out-Null
    Go 'pages/student/onboarding.html'
    Check 'New student profile gets its own guide' (Ready)
    Check 'Student guide preferences are separated by profile' (Eval "document.getElementById('cm-user-guide').open&&document.querySelector('.cm-guide-role').textContent==='Student guide'")
    Eval "document.querySelector('.cm-guide-close').click();cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Guide Tester',email:'guide@example.com',role:'student',isDemo:true}));codeMentorTheme.set('light');true"|Out-Null
    Check 'Learning data survives the guide' (Eval "JSON.parse(cmStorage.getItem('codementor-demo-learning')).lessons.length===0&&JSON.parse(cmStorage.getItem('codementor-demo-onboarding')).language==='python'")
    Go 'pages/auth/login.html'
    Check 'Guide never blocks sign-in pages' (Eval "!document.getElementById('cm-user-guide')&&!document.querySelector('.cm-guide-launcher')")
    Check 'No uncaught JavaScript errors' ($script:jsErrors.Count -eq 0)
    $checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/user-guide-results.json')
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}
