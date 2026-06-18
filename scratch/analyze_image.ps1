Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("d:/Sports_Physio_Software/sports-health-hub-main/public/anatomy_heatmap_bg.png")
$width = $bmp.Width
$height = $bmp.Height

# Scan the trunk area to get a clean centroid of the body silhouette
# Y from 300 to 700 (torso/hips/thighs)
$leftSumX = 0
$leftCount = 0
$rightSumX = 0
$rightCount = 0

for ($y = 300; $y -lt 700; $y += 2) {
    for ($x = 0; $x -lt $width; $x += 2) {
        $pixel = $bmp.GetPixel($x, $y)
        # Background is white/transparent (R, G, B > 240 or A < 50)
        $isBg = ($pixel.A -lt 50) -or ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240)
        
        if (-not $isBg) {
            if ($x -lt ($width / 2)) {
                $leftSumX += $x
                $leftCount++
            } else {
                $rightSumX += $x
                $rightCount++
            }
        }
    }
}

$bmp.Dispose()

if ($leftCount -gt 0) {
    $leftCenter = $leftSumX / $leftCount
    $leftCenterSvg = $leftCenter * (500 / 512)
    Write-Output "Left Half Trunk Centroid: Pixel X=$leftCenter, SVG X=$leftCenterSvg"
}
if ($rightCount -gt 0) {
    $rightCenter = $rightSumX / $rightCount
    $rightCenterSvg = 500 + ($rightCenter - 512) * (500 / 512)
    Write-Output "Right Half Trunk Centroid: Pixel X=$rightCenter, SVG X=$rightCenterSvg"
}
