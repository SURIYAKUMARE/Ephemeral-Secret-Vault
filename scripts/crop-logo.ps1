Add-Type -AssemblyName System.Drawing

$inputPath = Join-Path (Get-Location) "public\images\logo.png"
$outputPath = Join-Path (Get-Location) "public\images\logo-icon.png"
$faviconPath = Join-Path (Get-Location) "public\favicon.png"

$src = [System.Drawing.Image]::FromFile($inputPath)
Write-Host "Original image dimensions: $($src.Width) x $($src.Height)"

# Crop the glowing padlock shield with orbital ring in the upper/center portion
$cropWidth = [int]($src.Width * 0.52)
$cropHeight = [int]($src.Height * 0.68)
$cropX = [int](($src.Width - $cropWidth) / 2)
$cropY = [int]($src.Height * 0.05)

$bmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle(0, 0, $cropWidth, $cropHeight)
$g.DrawImage($src, $destRect, $cropX, $cropY, $cropWidth, $cropHeight, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($faviconPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Host "Logo icon cropped and saved to: $outputPath and $faviconPath"
