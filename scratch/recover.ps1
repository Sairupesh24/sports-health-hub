$transcriptPath = "C:\Users\kavut\.gemini\antigravity\brain\5c50d2a2-55c6-41a7-8cc5-e07e65517710\.system_generated\logs\transcript.jsonl"
$outputPath = "d:\Sports_Physio_Software\sports-health-hub-main\scratch\SorenessHeatmap_recovered.tsx"

$lines = Get-Content $transcriptPath
foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
        $obj = $line | ConvertFrom-Json
        if ($obj -and $obj.tool_calls) {
            foreach ($tc in $obj.tool_calls) {
                if ($tc.name -eq 'write_to_file' -and $tc.args.TargetFile -like '*SorenessHeatmap.tsx*') {
                    $code = $tc.args.CodeContent
                    # Some tool calls are JSON objects, check if it is string
                    if ($code) {
                        $code | Out-File $outputPath -Encoding utf8
                        Write-Host "Recovered code to $outputPath"
                    }
                }
            }
        }
    } catch {
        # Skip json parse errors
    }
}
