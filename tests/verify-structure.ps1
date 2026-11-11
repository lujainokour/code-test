param([string]$AppRoot = '/', [string]$ReportPrefix = 'structure', [string]$HarnessFilter = '*.html', [int]$HarnessTimeoutSeconds = 180)
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
    Cdp 'Runtime.enable' @{} | Out-Null

    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=900;deviceScaleFactor=1;mobile=$false} | Out-Null
    Cdp 'Emulation.setFocusEmulationEnabled' @{enabled=$true} | Out-Null
    $results=@()
    foreach($harness in Get-ChildItem $PSScriptRoot -Filter $HarnessFilter) {
        # This is a blank host for the separate reference audit below.
        if ($harness.Name -eq 'site-audit.html') { continue }
        Cdp 'Page.navigate' @{url=('http://127.0.0.1:8765/tests/'+$harness.Name+'?run=disposable-profile&appRoot='+[uri]::EscapeDataString($AppRoot))} | Out-Null
        $done=$false
        for($n=0;$n -lt ($HarnessTimeoutSeconds * 10);$n++) {
            Start-Sleep -Milliseconds 100
            $done=Eval "document.getElementById('results')?.dataset.done === 'true' || document.documentElement.dataset.done === 'true'"
            if($done){break}
        }
        $value=Eval "(()=>{try{return JSON.parse(document.getElementById('results').textContent)}catch{return {error:document.body.innerText}}})()"
        $results+=@{harness=$harness.Name;done=$done;result=$value}
        Write-Output ($harness.Name+': '+$value.passed+'/'+$value.total+' done='+$done)
        $value.checks | Where-Object {!$_.passed} | ForEach-Object { Write-Output ('  FAIL '+$_.name) }
    }
    if ($results.Count) { $results | ConvertTo-Json -Depth 20 | Set-Content (Join-Path (Split-Path $PSScriptRoot) ('docs/'+$ReportPrefix+'-harness-results.json')) }
    Cdp 'Page.navigate' @{url=('http://127.0.0.1:8765/tests/browser-smoke.html?appRoot='+[uri]::EscapeDataString($AppRoot))} | Out-Null
    Start-Sleep -Milliseconds 200
    $socket.Dispose()
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    Cdp 'Runtime.enable' @{} | Out-Null
    $audit=Eval ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'reference-audit.js')))
    $audit | ConvertTo-Json -Depth 20 | Set-Content (Join-Path (Split-Path $PSScriptRoot) ('docs/'+$ReportPrefix+'-reference-results.json'))
    ConvertTo-Json -InputObject @($script:jsErrors) -Depth 20 | Set-Content (Join-Path (Split-Path $PSScriptRoot) ('docs/'+$ReportPrefix+'-js-errors.json'))
    Write-Output ('Reference audit: '+$audit.pages.Count+' page visits, '+$audit.checkedReferences+' references, '+$audit.missing.Count+' missing; JS exceptions: '+$script:jsErrors.Count)
    $audit.missing | ConvertTo-Json -Compress
    $failedRuns = @($results | Where-Object { !$_.done -or $null -eq $_.result.total -or $_.result.passed -ne $_.result.total })
    $brokenPageImages = @($audit.pages | Where-Object { $_.brokenImages.Count })
    if ($failedRuns.Count -or $audit.missing.Count -or $brokenPageImages.Count -or $script:jsErrors.Count) { throw 'Verification failed. Review the saved harness, reference and JavaScript error reports.' }
} finally {
    if($socket){$socket.Dispose()}
    if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}
}






