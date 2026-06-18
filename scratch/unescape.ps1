$raw = Get-Content "d:\Sports_Physio_Software\sports-health-hub-main\scratch\SorenessHeatmap_recovered.tsx" -Raw
# Remove outer quotes if present
if ($raw.StartsWith('"') -and $raw.EndsWith('"')) {
    $raw = $raw.Substring(1, $raw.Length - 2)
}
# Replace escaped newlines
$unescaped = $raw.Replace("\n", "`r`n").Replace('\"', '"').Replace('\\\\', '\')
$unescaped | Out-File "d:\Sports_Physio_Software\sports-health-hub-main\scratch\SorenessHeatmap_unescaped.tsx" -Encoding utf8
Write-Host "Unescaped code written to scratch/SorenessHeatmap_unescaped.tsx"
