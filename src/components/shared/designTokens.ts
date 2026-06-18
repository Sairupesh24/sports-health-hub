export const designTokens = {
  colors: {
    bg: "#0A1628", // Navy background
    accent: "#C8F135", // Volt green accent
    good: "#22C55E", // Green (>= 80% or >= +10% ref)
    moderate: "#F59E0B", // Amber (60-79% or -10% to 9% ref)
    needsImprovement: "#F97316", // Orange (40-59% or -30% to -11% ref)
    priority: "#EF4444", // Red (< 40% or < -30% ref)
    neutralText: "#F8FAFC",
    mutedText: "#94A3B8",
  },
  statusColors: {
    good: "#22C55E",
    moderate: "#F59E0B",
    "needs-improvement": "#F97316",
    priority: "#EF4444",
  }
} as const;

export type MetricStatus = "good" | "moderate" | "needs-improvement" | "priority";

export function getStatusColor(status: MetricStatus): string {
  return designTokens.statusColors[status];
}
