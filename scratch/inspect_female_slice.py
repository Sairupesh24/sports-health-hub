from PIL import Image
import numpy as np

img = Image.open('public/body_female_front.jpg')
arr = np.array(img)

# In female image, crotch is at y=480, x=303.5
# Let's inspect rows around y=475..495, x=290..320
print("Female crotch region pixel slice (R channel):")
for y in range(476, 492, 2):
    row_r = arr[y, 295:313, 0]
    print(f"y={y}: {row_r}")
