from PIL import Image, ImageDraw, ImageFilter
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img).astype(np.float64)

# Bounding box of edit:
# x: 285 to 335
# y: 460 to 505

# In this region:
# Left skin boundary is at x=280..288 (left thigh / flank)
# Right skin boundary is at x=330..338 (right thigh / flank)
# Top boundary is at y=450..458 (lower belly)
# Bottom boundary is at y=500..505 (inner thigh white gap and inner thigh lines)

# Let's see what the image looks like if we reconstruct the plain skin:
# Notice how the skin tone behaves across the abdomen:
# As y increases from 440 to 480:
# The center is slightly highlighted or smooth peach gradient:
# At y=450, x=300: arr[450, 300] is [232, 186, 160]
# At y=460, left of penis (x=297): arr[460, 297] is [240, 198, 172]
# At y=460, right of penis (x=324): arr[460, 324] is [235, 190, 166]

print("Top belly skin at 455, 300:", arr[455, 300])
print("Left thigh skin at 480, 285:", arr[480, 285])
print("Right thigh skin at 480, 335:", arr[480, 335])
