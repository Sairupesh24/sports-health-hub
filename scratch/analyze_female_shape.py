from PIL import Image
import numpy as np

img = Image.open('scratch/female_groin_crop.png')
arr = np.array(img)

print("Female crop shape:", arr.shape)
# Find dark contour lines in female crop:
for y in range(20, 60, 2):
    row = arr[y, :]
    darks = np.where(row[:, 0] < 120)[0]
    whites = np.where((row[:, 0] > 250) & (row[:, 1] > 250) & (row[:, 2] > 250))[0]
    w_str = f"white: {whites[0]}..{whites[-1]}" if len(whites) > 0 else "no white"
    print(f"y={y}: dark at {darks}, {w_str}")
