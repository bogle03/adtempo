param([ValidateSet('status','enable','disable')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'startup.ps1')
if ($Action -eq 'enable') { Set-DaylogStartup $true }
if ($Action -eq 'disable') { Set-DaylogStartup $false }
@{autoStart=[bool](Get-DaylogStartupEnabled)} | ConvertTo-Json -Compress
