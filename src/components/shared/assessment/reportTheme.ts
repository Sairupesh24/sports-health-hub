export const reportTheme = {
  bgPage: "hsl(var(--background))",
  bgSurface: "hsl(var(--card))",
  bgSurfaceElevated: "hsl(var(--popover))",
  border: "hsl(var(--border))",
  textPrimary: "hsl(var(--foreground))",
  textMuted: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--primary))",
  accentBg: "hsl(var(--primary) / 0.1)",
} as const;

console.log("[reportTheme] Loaded semantic slots:", reportTheme);
