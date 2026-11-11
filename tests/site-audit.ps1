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
    Cdp 'Runtime.enable' @{}|Out-Null
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8903/tests/site-audit.html'}|Out-Null
    Start-Sleep -Milliseconds 400
    # Do not run legacy storage-mutating harnesses alongside this read-only route audit.
    Cdp 'Page.navigate' @{url='http://127.0.0.1:8903/tests/site-audit.html'}|Out-Null
    Start-Sleep -Milliseconds 200
    $audit=Eval ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'reference-audit.js')))
    $audit|ConvertTo-Json -Depth 12|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/site-audit-results.json')
    $script:jsErrors|ConvertTo-Json -Depth 12|Set-Content (Join-Path (Split-Path $PSScriptRoot) 'docs/site-audit-js-errors.json')
    Write-Output ('Page visits: '+$audit.pages.Count+'; references: '+$audit.checkedReferences+'; missing: '+$audit.missing.Count+'; JS errors: '+$script:jsErrors.Count)
    $audit.missing|ConvertTo-Json -Compress
    $audit.pages|Where-Object {$_.brokenImages.Count -or !$_.brandsHome}|ConvertTo-Json -Depth 5
    $script:jsErrors|ConvertTo-Json -Depth 6
}finally{if($socket){$socket.Dispose()};if($chrome -and !$chrome.HasExited){Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue}}