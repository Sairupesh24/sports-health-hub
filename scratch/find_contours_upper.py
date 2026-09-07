from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

for y in range(440, 480, 4):
    row = arr[y, 260:340]
    darks = np.where(row[:, 0] < 120)[0]
    print(f'y={y}: dark x at {[260+d for d in darks]}')
