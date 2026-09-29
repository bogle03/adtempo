$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../windows/startup.ps1')
$testRoot = 'HKCU:\Software\TempoStartupRegression-' + [guid]::NewGuid().ToString('N')
$oldExe = $env:TEMPO_EXE
$oldDir = $env:DAYLOG_STARTUP_DIR
try {
    $env:TEMPO_EXE = (Get-Process -Id $PID).Path
    $env:DAYLOG_STARTUP_DIR = ''
    function Get-TempoRunPath { Join-Path $testRoot 'Run' }
    function Get-TempoApprovalPath { Join-Path $testRoot 'Approved' }
    function Get-DaylogStartupPath { Join-Path $env:TEMP ('tempo-missing-' + [guid]::NewGuid().ToString('N') + '.lnk') }
    New-Item -Path $testRoot | Out-Null
    New-Item -Path (Get-TempoRunPath) | Out-Null
    New-Item -Path (Get-TempoApprovalPath) | Out-Null
    New-ItemProperty -Path (Get-TempoRunPath) -Name OtherApp -Value 'unchanged command' -PropertyType String | Out-Null
    New-ItemProperty -Path (Get-TempoApprovalPath) -Name OtherApp -Value ([byte[]]@(3,0,0,0,1,2,3,4)) -PropertyType Binary | Out-Null
    foreach ($enabled in @($true,$true,$false,$true,$false)) {
        Set-DaylogStartup $enabled
        if ((Get-DaylogStartupEnabled) -ne $enabled) { throw 'Tempo state incorrect' }
        if ((Get-ItemProperty -Path (Get-TempoRunPath)).OtherApp -ne 'unchanged command') { throw 'Other startup registration changed' }
        $bytes = (Get-ItemProperty -Path (Get-TempoApprovalPath)).OtherApp
        if ([BitConverter]::ToString($bytes) -ne '03-00-00-00-01-02-03-04') { throw 'Other approval changed' }
    }
    Write-Output 'PASS: repeated enable/disable preserves other startup registrations and approval bytes'
} finally {
    $env:TEMPO_EXE = $oldExe
    $env:DAYLOG_STARTUP_DIR = $oldDir
    foreach ($child in @('Run','Approved')) {
        $key = Join-Path $testRoot $child
        if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key }
    }
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot }
}
