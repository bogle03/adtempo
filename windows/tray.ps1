param([switch]$Quiet)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'startup.ps1')
$project = Split-Path $PSScriptRoot -Parent
$baseUrl = 'http://127.0.0.1:4318'
$logPath = Join-Path $project 'data\tray.log'
function Write-DaylogError($Message) {
    Add-Content -LiteralPath $logPath -Value ((Get-Date -Format o) + ' ' + $Message)
}
function Open-Daylog {
    $chrome = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $baseUrl -WindowStyle Normal }
    else { Start-Process -FilePath 'explorer.exe' -ArgumentList $baseUrl -WindowStyle Hidden }
}
function Get-DaylogState {
    try { Invoke-RestMethod -Uri ($baseUrl + '/api/state') -TimeoutSec 2 }
    catch { $null }
}
function Start-DaylogServer {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $project -WindowStyle Hidden
}
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\Daylog.Tray.4318', [ref]$created)
if (-not $created) { if (-not $Quiet) { Open-Daylog }; $mutex.Dispose(); exit }
$notify = $null
$timer = $null
try {
    [System.Windows.Forms.Application]::EnableVisualStyles()
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $daylogIcon = New-Object System.Drawing.Icon((Join-Path $project 'assets\daylog-v2.ico'),32,32)
    $notify.Icon = $daylogIcon
    $notify.Text = 'Daylog - starting'
    $menu = New-Object System.Windows.Forms.ContextMenuStrip
    $status = $menu.Items.Add('Daylog - starting')
    $status.Enabled = $false
    [void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
    $open = $menu.Items.Add('Daylog 열기 (Chrome)')
    $open.Add_Click({ Open-Daylog })
    $restart = $menu.Items.Add('서버 다시 켜기')
    $restart.Add_Click({ if (-not (Get-DaylogState)) { Start-DaylogServer } })
    $startup = $menu.Items.Add('Windows 로그인 시 자동 실행')
    $startup.Checked = Get-DaylogStartupEnabled
    $startup.Add_Click({
        try { Set-DaylogStartup (-not $startup.Checked); $startup.Checked = -not $startup.Checked }
        catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Daylog') }
    })
    [void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
    $quit = $menu.Items.Add('Daylog 종료 (기록 중지)')
    $quit.Add_Click({
        $current = Get-DaylogState
        if ($current) {
            try { Invoke-RestMethod -Method Post -Uri ($baseUrl + '/api/shutdown') -Headers @{'X-Daylog-Token'=$current.token} -ContentType 'application/json' -Body '{}' -TimeoutSec 3 | Out-Null }
            catch { [System.Windows.Forms.MessageBox]::Show('서버 종료에 실패했습니다. 잠시 후 다시 시도해주세요.', 'Daylog'); return }
        }
        [System.Windows.Forms.Application]::Exit()
    })
    $menu.Add_Opening({ $startup.Checked = Get-DaylogStartupEnabled })
    $notify.ContextMenuStrip = $menu
    $notify.Add_DoubleClick({ Open-Daylog })
    $notify.Visible = $true
    if (-not (Get-DaylogState)) { Start-DaylogServer }
    $script:retryAfter = [DateTime]::Now.AddSeconds(15)
    $script:firstReady = $true
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 3000
    $timer.Add_Tick({
        try {
            $current = Get-DaylogState
            if ($current) {
                $count = @($current.sessions | Where-Object { $null -eq $_.end }).Count
                $status.Text = '실행 중 · ' + $count + '개 활동 기록 중'
                $notify.Text = 'Daylog · ' + $count + '개 활동 기록 중'
                if ($script:firstReady) { $script:firstReady = $false; if (-not $Quiet) { Open-Daylog } }
                $script:retryAfter = [DateTime]::Now.AddSeconds(15)
            } else {
                $status.Text = '서버 연결 확인 중'
                $notify.Text = 'Daylog - reconnecting'
                if ([DateTime]::Now -gt $script:retryAfter) {
                    Start-DaylogServer
                    $script:retryAfter = [DateTime]::Now.AddSeconds(30)
                }
            }
        } catch { Write-DaylogError $_.Exception.Message }
    })
    $timer.Start()
    [System.Windows.Forms.Application]::Run()
} catch {
    Write-DaylogError $_.Exception.ToString()
} finally {
    if ($timer) { $timer.Stop(); $timer.Dispose() }
    if ($notify) { $notify.Visible = $false; $notify.Dispose() }
    if ($daylogIcon) { $daylogIcon.Dispose() }
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
