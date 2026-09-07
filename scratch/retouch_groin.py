from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load original male front image
orig = Image.open('public/body_male_front.jpg').convert('RGB')
arr = np.array(orig)
h, w, _ = arr.shape

# Let's inspect the exact skin gradient across the pelvis:
# At y=455:
# x=270..330:
row_455 = arr[455, :, :]
# We can see the natural skin color without lines at (455, 290) and (455, 310)

print("Original image loaded:", w, h)
