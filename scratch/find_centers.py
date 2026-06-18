import os
from PIL import Image
import numpy as np

img_path = 'public/anatomy_heatmap_bg_grayscale.png'
if not os.path.exists(img_path):
    print("Image not found!")
    exit(1)

img = Image.open(img_path)
width, height = img.size
print(f"Loaded image {img_path}: width={width}, height={height}")

# Convert to grayscale numpy array
gray = np.array(img.convert('L'))

# Invert so that body figure (darker pixels) is high values, and white background (255) is 0.
inverted = 255 - gray

# Zero out edges to avoid border noise
inverted[:, :20] = 0
inverted[:, -20:] = 0

# Left half (Front View)
left_half = inverted[:, :width//2]
left_proj = np.sum(left_half, axis=0)
left_center = np.argmax(left_proj)
print(f"Front view (left half) peak column: {left_center} px (relative to 0)")

# Right half (Back View)
right_half = inverted[:, width//2:]
right_proj = np.sum(right_half, axis=0)
right_center = width//2 + np.argmax(right_proj)
print(f"Back view (right half) peak column: {right_center} px (relative to 0)")

# Let's print the average center of mass (weighted average) for both halves
left_cols = np.arange(width//2)
left_com = np.sum(left_cols * left_proj) / np.sum(left_proj)
print(f"Front view Center of Mass: {left_com:.2f} px")

right_cols = np.arange(width//2, width)
right_com = np.sum(right_cols * right_proj) / np.sum(right_proj)
print(f"Back view Center of Mass: {right_com:.2f} px")
