$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'
[IO.Directory]::CreateDirectory($assetDir) | Out-Null
$bitmap = New-Object Drawing.Bitmap(256,256)
$g = [Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.Color]::Transparent)
$shape = New-Object Drawing.Drawing2D.GraphicsPath
foreach ($arc in @(@(8,8,108,108,180,90),@(140,8,108,108,270,90),@(140,140,108,108,0,90),@(8,140,108,108,90,90))) {
    $shape.AddArc($arc[0],$arc[1],$arc[2],$arc[3],$arc[4],$arc[5])
}
$shape.CloseFigure()
$brush = New-Object Drawing.Drawing2D.LinearGradientBrush([Drawing.Point]::new(0,0),[Drawing.Point]::new(256,256),[Drawing.Color]::FromArgb(52,55,70),[Drawing.Color]::FromArgb(25,28,39))
$g.FillPath($brush,$shape)
$edge = New-Object Drawing.Pen([Drawing.Color]::FromArgb(20,255,255,255),1)
$g.DrawPath($edge,$shape)
$pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(243,241,235),14)
$pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($pen,55,55,146,146,20,230)
$accent = New-Object Drawing.Pen([Drawing.Color]::FromArgb(179,160,245),14)
$accent.StartCap = [Drawing.Drawing2D.LineCap]::Round
$accent.EndCap = [Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($accent,55,55,146,146,270,90)
$hand = New-Object Drawing.Pen([Drawing.Color]::FromArgb(243,241,235),12)
$hand.StartCap = [Drawing.Drawing2D.LineCap]::Round
$hand.EndCap = [Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($hand,128,90,128,128)
$g.DrawLine($hand,128,128,154,145)
$bitmap.Save((Join-Path $assetDir 'daylog-v2.png'),[Drawing.Imaging.ImageFormat]::Png)
$sizes = @(16,24,32,48,64,128,256)
$frames = @()
foreach ($size in $sizes) {
    $small = New-Object Drawing.Bitmap($size,$size)
    $sg = [Drawing.Graphics]::FromImage($small)
    $sg.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $sg.DrawImage($bitmap,0,0,$size,$size)
    $stream = New-Object IO.MemoryStream
    $small.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
    $frames += ,$stream.ToArray()
    $stream.Dispose(); $sg.Dispose(); $small.Dispose()
}
$file = [IO.File]::Create((Join-Path $assetDir 'daylog-v2.ico'))
$writer = New-Object IO.BinaryWriter($file)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i=0; $i -lt $sizes.Count; $i++) {
    $dimension = if ($sizes[$i] -eq 256) {0} else {$sizes[$i]}
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$frames[$i].Length); $writer.Write([uint32]$offset)
    $offset += $frames[$i].Length
}
foreach ($frame in $frames) {$writer.Write([byte[]]$frame)}
$writer.Dispose(); $file.Dispose()
$edge.Dispose(); $accent.Dispose(); $hand.Dispose(); $pen.Dispose(); $brush.Dispose(); $shape.Dispose(); $g.Dispose(); $bitmap.Dispose()
Write-Output 'Created daylog-v2.png and daylog-v2.ico (7 sizes).'
