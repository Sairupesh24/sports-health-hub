# Script to generate symmetric SVG paths for body heatmap
import json

def make_symmetric_path(left_points, right_points=None, closed=True):
    # Left points: list of tuples (cmd, coordinates...)
    # We will mirror them across X=100
    pass

# We can directly design the coordinates. Let's write a html page to visualize the SVG layout.
# This is a very helpful technique to make sure the paths are visually perfect.
html_content = """
<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #0f172a; color: white; font-family: sans-serif; display: flex; justify-content: center; gap: 40px; padding: 40px; }
  .view-container { text-align: center; }
  svg { background: #1e293b; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  path { transition: fill 0.2s, stroke 0.2s; }
  path:hover { fill: #38bdf8 !important; }
  .selected { fill: #ef4444 !important; }
</style>
</head>
<body>
  <div class="view-container">
    <h2>Anterior (Front)</h2>
    <svg width="300" height="480" viewBox="0 0 200 320">
      <!-- Body Silhouette -->
      <path d="M100,10 
               C112,10 118,18 118,30 C118,40 110,48 100,48 C90,48 82,40 82,30 C82,18 88,10 100,10 Z
               M93,48 C93,54 90,56 86,58 C74,62 60,68 58,82 C56,92 50,118 48,130 C46,138 52,142 56,138 C58,132 62,120 64,115
               L68,115 L64,152 C62,165 72,170 76,165 L76,170 L72,228 C70,240 64,250 66,285 L76,285 L76,295 L72,308 L86,308 L84,295 L84,285
               L92,285 L96,160 L100,160 L104,160 L108,160 L104,285 L108,285 L116,285 L116,295 L114,308 L128,308 L124,295 L124,285
               C126,250 120,240 118,228 L114,170 L124,170 C128,175 138,170 136,152 L132,115 L136,115 C138,120 142,132 144,138
               C148,142 154,138 152,130 C150,118 144,92 142,82 C140,68 126,62 114,58 C110,56 107,54 107,48 Z" 
            fill="#334155" stroke="#475569" stroke-width="1.5" />
    </svg>
  </div>
</body>
</html>
"""

with open("d:/Sports_Physio_Software/sports-health-hub-main/scratch/test_svg.html", "w") as f:
    f.write(html_content)
print("Wrote test html file")
