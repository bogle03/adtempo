$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'startup.ps1')
Set-DaylogStartup $true
Write-Output ('Startup enabled: ' + (Get-DaylogStartupPath))
