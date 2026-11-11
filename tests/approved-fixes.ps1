param([string]$BaseUrl = 'http://127.0.0.1:8765/', [string]$HarnessFilter = 'mentor-isolation.html', [switch]$Detailed)
$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-approved-fixes-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--remote-allow-origins=*','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
Add-Type -Path (Join-Path $PSScriptRoot 'CdpSocket.cs')
$socket = $null
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt = 0; $attempt -lt 100 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object type -eq 'page' | Select-Object -First 1
    $socket = New-Object CdpSocket($target.webSocketDebuggerUrl.Replace('localhost','127.0.0.1'))
    $script:sequence = 0; $script:exceptions = @(); $script:consoleErrors = @()
    function Cdp($method, $parameters) {
        $script:sequence++; $id = $script:sequence
        $socket.Send((@{ id=$id; method=$method; params=$parameters } | ConvertTo-Json -Depth 15 -Compress))
        do {
            $response = $socket.Receive() | ConvertFrom-Json
            if ($response.method -eq 'Runtime.exceptionThrown') { $script:exceptions += $response.params.exceptionDetails }
            if ($response.method -eq 'Runtime.consoleAPICalled' -and $response.params.type -eq 'error') { $script:consoleErrors += $response.params }
        } while ($response.id -ne $id)
        if ($response.error) { throw ($response.error | ConvertTo-Json) }
        return $response.result
    }
    function Eval($expression) {
        $r = Cdp 'Runtime.evaluate' @{ expression=$expression; returnByValue=$true; awaitPromise=$true }
        if ($r.exceptionDetails) { throw ($r.exceptionDetails | ConvertTo-Json -Depth 8) }
        return $r.result.value
    }
    Cdp 'Runtime.enable' @{} | Out-Null
    Cdp 'Emulation.setFocusEmulationEnabled' @{enabled=$true} | Out-Null
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=900;deviceScaleFactor=1;mobile=$false} | Out-Null
    $results = @()
    foreach ($harness in Get-ChildItem $PSScriptRoot -Filter $HarnessFilter) {
        if ((Get-Content -Raw -LiteralPath $harness.FullName) -notmatch 'id=["'']results["'']') {
            Write-Output ('Not a test harness (no results element): ' + $harness.Name)
            continue
        }
        $url = $BaseUrl.TrimEnd('/') + '/tests/' + $harness.Name + '?run=disposable-profile'
        Cdp 'Page.navigate' @{url=$url} | Out-Null
        $done = $false
        for ($n=0; $n -lt 1800; $n++) {
            Start-Sleep -Milliseconds 100
            $done = Eval "location.pathname.endsWith('/tests/$($harness.Name)') && (document.getElementById('results')?.dataset.done === 'true' || document.documentElement.dataset.done === 'true')"
            if ($done) { break }
        }
        if (!$done) { throw "Harness did not complete: $($harness.Name)" }
        $value = Eval "JSON.parse(document.getElementById('results').textContent)"
        $results += @{harness=$harness.Name;passed=$value.passed;total=$value.total;checks=$value.checks}
        Write-Output ("$($harness.Name): $($value.passed)/$($value.total)")
        $value.checks | Where-Object {!$_.passed} | ForEach-Object { Write-Output ('FAIL: '+$_.name) }
    }
    if (!$results.Count) { throw "No harness matched $HarnessFilter" }
    Write-Output ('Uncaught JavaScript exceptions: ' + $script:exceptions.Count)
    Write-Output ('Browser console errors: ' + $script:consoleErrors.Count)
    if ($script:consoleErrors.Count) { $script:consoleErrors | ConvertTo-Json -Depth 10 }
    if ($Detailed) { $results | ConvertTo-Json -Depth 12 }
    if (($results | Where-Object {$_.passed -ne $_.total}).Count -or $script:exceptions.Count -or $script:consoleErrors.Count) { throw 'Regression checks failed; see every failed assertion and browser error above.' }
} finally {
    if ($socket) { $socket.Dispose() }
    if ($chrome -and !$chrome.HasExited) { $chrome.Kill() }
}
