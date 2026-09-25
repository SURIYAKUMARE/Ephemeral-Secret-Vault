Add-Type -AssemblyName System.Drawing

$mediaPath = 'C:\Users\SURYAASWIN\.gemini\antigravity\brain\fdd9afab-9cc4-4f56-81ff-79bb92b3da11\.user_uploaded\media_1790329535805.png'
$pubImagesLogo = Join-Path (Get-Location) "public\images\logo.png"
$pubRootLogo = Join-Path (Get-Location) "public\logo.png"

$pubImagesIcon = Join-Path (Get-Location) "public\images\logo-icon.png"
$pubRootIcon = Join-Path (Get-Location) "public\logo-icon.png"

$pubImagesFavicon = Join-Path (Get-Location) "public\images\favicon.png"
$pubRootFavicon = Join-Path (Get-Location) "public\favicon.png"
$pubRootIco = Join-Path (Get-Location) "public\favicon.ico"

# 1. Copy original master transparent image
Copy-Item -Path $mediaPath -Destination $pubImagesLogo -Force
Copy-Item -Path $mediaPath -Destination $pubRootLogo -Force
Write-Host "Copied master logo to $pubImagesLogo and $pubRootLogo"

# 2. Crop centered square (660 x 660) and scale to 512 x 512
$src = [System.Drawing.Image]::FromFile($mediaPath)
Write-Host "Source image dimensions: $($src.Width) x $($src.Height)"

$cropSize = 660
$cropX = 184
$cropY = 16

$outSize = 512
$bmp512 = New-Object System.Drawing.Bitmap($outSize, $outSize)
$g512 = [System.Drawing.Graphics]::FromImage($bmp512)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g512.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g512.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$destRect512 = New-Object System.Drawing.Rectangle(0, 0, $outSize, $outSize)
$g512.DrawImage($src, $destRect512, $cropX, $cropY, $cropSize, $cropSize, [System.Drawing.GraphicsUnit]::Pixel)

$bmp512.Save($pubImagesIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save($pubRootIcon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved 512x512 logo icon to $pubImagesIcon and $pubRootIcon"

# 3. Create Favicon 128x128
$favSize = 128
$bmpFav = New-Object System.Drawing.Bitmap($favSize, $favSize)
$gFav = [System.Drawing.Graphics]::FromImage($bmpFav)
$gFav.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFav.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFav.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gFav.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$destRectFav = New-Object System.Drawing.Rectangle(0, 0, $favSize, $favSize)
$gFav.DrawImage($src, $destRectFav, $cropX, $cropY, $cropSize, $cropSize, [System.Drawing.GraphicsUnit]::Pixel)

$bmpFav.Save($pubImagesFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpFav.Save($pubRootFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpFav.Save($pubRootIco, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved favicon to $pubImagesFavicon, $pubRootFavicon, and $pubRootIco"

$gFav.Dispose()
$bmpFav.Dispose()
$g512.Dispose()
$bmp512.Dispose()
$src.Dispose()

Write-Host "All logo assets updated successfully!"
