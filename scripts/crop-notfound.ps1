Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\SURYAASWIN\.gemini\antigravity\brain\fdd9afab-9cc4-4f56-81ff-79bb92b3da11\.user_uploaded\media_1790328288728.png"
$outputPath = Join-Path (Get-Location) "public\images\pedestal-lock.png"

$src = [System.Drawing.Image]::FromFile($inputPath)

# Crop the glowing 3D glass padlock pedestal cleanly on the left (x: 50 to 425)
$cropX = 40
$cropY = 70
$cropWidth = 385
$cropHeight = 440

$bmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle(0, 0, $cropWidth, $cropHeight)
$g.DrawImage($src, $destRect, $cropX, $cropY, $cropWidth, $cropHeight, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Host "Pedestal lock cleanly cropped: $outputPath"
