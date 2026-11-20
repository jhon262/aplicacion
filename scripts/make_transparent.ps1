Add-Type -AssemblyName System.Drawing
$inputPath = "c:\Users\Usuario\Desktop\tesis\Aplicación\client\public\escudo-ecuador.jpg"
$outputPath = "c:\Users\Usuario\Desktop\tesis\Aplicación\client\public\escudo-ecuador.png"

$bmp = [System.Drawing.Bitmap]::FromFile($inputPath)
Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"

# Create a new 32-bit ARGB bitmap
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $p = $bmp.GetPixel($x, $y)
        # Check if the pixel is near white (background)
        if ($p.R -gt 245 -and $p.G -gt 245 -and $p.B -gt 245) {
            # Transparent
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        } elseif ($p.R -gt 230 -and $p.G -gt 230 -and $p.B -gt 230) {
            # Soft edge anti-aliasing
            $alpha = [int]((255 - [Math]::Max($p.R, [Math]::Max($p.G, $p.B))) * 255 / 25)
            if ($alpha -lt 0) { $alpha = 0 }
            if ($alpha -gt 255) { $alpha = 255 }
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
        } else {
            $newBmp.SetPixel($x, $y, $p)
        }
    }
}

$bmp.Dispose()
$newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Dispose()
Write-Host "Done! Saved transparent PNG to $outputPath"
