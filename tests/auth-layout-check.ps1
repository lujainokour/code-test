param([string]$AppRoot = '/', [string]$ReportPrefix = 'structure', [string]$HarnessFilter = '*.html')
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
    $checks=@(); $metrics=@()
    function Check($name,$passed){$script:checks+=@{name=$name;passed=[bool]$passed};Write-Output "$passed : $name"}
    foreach($size in @(@{w=1366;h=768},@{w=768;h=900},@{w=390;h=844})) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false}|Out-Null
        foreach($page in @('login','signup')) {
            Cdp 'Page.navigate' @{url=('http://127.0.0.1:8765/pages/auth/'+$page+'.html')}|Out-Null
            Start-Sleep -Milliseconds 200
            Eval "window.codeMentorTheme.set('light');true"|Out-Null
            $m=Eval "(()=>{const a=document.querySelector('.auth-story').getBoundingClientRect(),b=document.querySelector('.auth-panel').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,gridChildren:document.querySelector('.auth-layout').children.length,sideBySide:Math.abs(a.top-b.top)<2,toolbarInPanel:!!document.querySelector('.auth-panel > .theme-toolbar'),imageFit:document.querySelector('.auth-visual img')?getComputedStyle(document.querySelector('.auth-visual img')).objectFit:null}})()"
            $metrics+=@{page=$page;width=$size.w;metrics=$m}
            Check "$page/$($size.w): no horizontal overflow" (!$m.overflow)
            Check "$page/$($size.w): theme stays inside the auth panel and preserves two grid children" ($m.gridChildren -eq 2 -and $m.toolbarInPanel)
            Check "$page/$($size.w): original panels do not overlap" (Eval "(()=>{const a=document.querySelector('.auth-story').getBoundingClientRect(),b=document.querySelector('.auth-panel').getBoundingClientRect();return innerWidth>800?a.width>0&&a.right<=b.left+1:a.bottom<=b.top+1})()")
            Check "$page/$($size.w): theme button is visible and reachable" (Eval "(()=>{const r=document.querySelector('.auth-panel .theme-toggle').getBoundingClientRect();return r.width===112&&r.height===50&&r.left>=0&&r.right<=innerWidth})()")
            $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true}
            [IO.File]::WriteAllBytes((Join-Path (Split-Path $PSScriptRoot) ('previews/auth-fixed-'+$page+'-'+$size.w+'.png')),[Convert]::FromBase64String($shot.data))
        }
    }
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks;metrics=$metrics}
    $result|ConvertTo-Json -Depth 6|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/auth-layout-results.json')
    $result|ConvertTo-Json -Depth 6
    if(@($checks|Where-Object {!$_.passed}).Count){throw 'Authentication layout checks failed'}
} finally { if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue} }
