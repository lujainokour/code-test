param(
    [string[]]$Suites = @('learning-upgrade','learning-support','site-fixes','submission-completion','kahoot-challenge','user-guide','certificates','services-input','services-arrival','footer-visual'),
    [string]$BaseUrl = 'http://127.0.0.1:8765/'
)
$ErrorActionPreference = 'Stop'
# Run unmodified assertions in a temporary mirror so historical reports and
# screenshots are never overwritten. Only the preview server port is mapped.
$runRoot = Join-Path $env:TEMP ('cm-stability-ps-' + [guid]::NewGuid().ToString('N'))
foreach ($folder in @('tests','docs','previews')) { New-Item -ItemType Directory -Path (Join-Path $runRoot $folder) -Force | Out-Null }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CdpSocket.cs') -Destination (Join-Path $runRoot 'tests/CdpSocket.cs')
Copy-Item -LiteralPath (Join-Path (Split-Path $PSScriptRoot) 'js') -Destination $runRoot -Recurse
$results = @()
foreach ($suite in $Suites) {
    if ($suite -notmatch '^[a-z-]+$') { throw 'Invalid suite name' }
    $source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot ($suite + '.ps1')))
    $source = [regex]::Replace($source, 'http://127\.0\.0\.1:\d+/', $BaseUrl)
    # Wait for the requested document, rather than assuming navigation finishes
    # within a fixed 200–450 ms when several isolated browser suites are active.
    $goSource = 'function Go($route) { $pageTarget=[uri]::new([uri]' + "'$BaseUrl'" + ',$route).AbsoluteUri; $pageLiteral=ConvertTo-Json -InputObject $pageTarget -Compress; Cdp ''Page.navigate'' @{url=$pageTarget}|Out-Null; for($probe=0;$probe -lt 100;$probe++){Start-Sleep -Milliseconds 100;if(Eval ("document.readyState === ''complete'' && location.href === "+$pageLiteral)){return}};throw (''Page did not finish loading: ''+$route) }'
    $source = [regex]::Replace($source, '(?m)^\s*function Go\(\$(?:path|page)\)[^\r\n]+$', [System.Text.RegularExpressions.MatchEvaluator]{param($match) $goSource})
    # Preserve application console errors even in older CDP harnesses that only
    # collected uncaught exceptions. This adds diagnostics, never filters them.
    $source = [regex]::Replace($source, '(?m)^(\s*function Eval[^\r\n]+)$', '$1' + "`n    Cdp 'Runtime.enable' @{} | Out-Null")
    $source = [regex]::Replace($source, '(?m)^(\s*\$response\s*=.*ConvertFrom-Json[^\r\n]*)$', '$1' + "`n" + '            if ($response.method -eq ''Runtime.consoleAPICalled'' -and $response.params.type -eq ''error'') { $script:consoleErrors += $response.params }')
    $header = ''
    if ($source -match '\Aparam\([^\r\n]+\)\r?\n') {
        $header = $Matches[0]
        $source = $source.Substring($header.Length)
    }
    $summaryPath = Join-Path $runRoot ($suite + '-summary.json')
    # finally captures completed assertions even when an original fail-fast
    # suite throws. Execution errors remain visible and count as errors.
    $source = $header + '$script:consoleErrors=@()' + "`ntry {`n" + $source + "`n} finally {`n" +
        '@{checks=@($checks); jsErrors=@($script:jsErrors); consoleErrors=@($script:consoleErrors); shellErrors=$Error.Count} | ConvertTo-Json -Depth 14 | Set-Content -Encoding UTF8 -LiteralPath ' + "'$summaryPath'`n}"
    $scriptPath = Join-Path $runRoot ('tests/' + $suite + '.ps1')
    [IO.File]::WriteAllText($scriptPath, $source)
    $logPath = Join-Path $runRoot ($suite + '.log')
    Push-Location $runRoot
    try {
        $ErrorActionPreference = 'Continue'
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath *> $logPath
        $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
    $value = Get-Content -Raw -LiteralPath $summaryPath | ConvertFrom-Json
    $checks = @($value.checks | Where-Object { $null -ne $_.passed })
    $failed = @($checks | Where-Object { !$_.passed })
    $result = [pscustomobject]@{suite=$suite;passed=$checks.Count-$failed.Count;failed=$failed.Count;completed=$checks.Count;exitCode=$exitCode;shellErrors=$value.shellErrors;jsErrors=@($value.jsErrors | Where-Object {$null -ne $_}).Count;consoleErrors=@($value.consoleErrors | Where-Object {$null -ne $_}).Count;log=$logPath}
    $results += $result
    $result | ConvertTo-Json -Compress
    $failed | ForEach-Object { Write-Output ('FAIL: ' + $_.name) }
    if ($exitCode) { Get-Content -LiteralPath $logPath -Tail 12 }
}
$results | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $runRoot 'summary.json')
Write-Output ('Results: ' + $runRoot)
if (@($results | Where-Object {$_.failed -or $_.exitCode -or $_.jsErrors -or $_.consoleErrors -or $_.shellErrors -or !$_.completed}).Count) { throw 'PowerShell regressions failed; see per-suite assertions and logs.' }
