param([string]$BaseUrl = 'http://127.0.0.1:8879/')
$root = Split-Path $PSScriptRoot -Parent
& (Join-Path $root 'tests/learning-upgrade.ps1') -BaseUrl $BaseUrl