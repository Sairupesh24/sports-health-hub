from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

print("Original image around y=454..462, x=300..320:")
for y in range(454, 463):
    row = arr[y, 300:320, :]
    min_c = row[:, 0].min()
    min_x = 300 + int(row[:, 0].argmin())
    print(f"y={y}: min_R={min_c} at x={min_x}")
