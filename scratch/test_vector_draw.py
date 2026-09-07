import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Load original
orig = Image.open('public/body_male_front.jpg').convert('RGB')
w, h = orig.size

# We will work on a 4x supersampled crop of the groin area:
# Crop bounds: (x0=260, y0=440, x1=360, y1=530)
# Width = 100, Height = 90
x0, y0, x1, y1 = 260, 440, 360, 530
scale = 4

crop = orig.crop((x0, y0, x1, y1)).convert('RGBA')
crop_hires = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

# Coordinates in hires crop:
# x_hires = (x - x0) * scale
# y_hires = (y - y0) * scale
# e.g., center x=300 -> (300 - 260) * 4 = 160
# y=490 -> (490 - 440) * 4 = 200

print("Hires crop size:", crop_hires.size)
