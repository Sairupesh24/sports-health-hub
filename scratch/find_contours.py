from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

for y in range(480, 520, 2):
    row = arr[y, 270:340]
    # find darkest pixels (the line art)
    darks = np.where(row[:, 0] < 100)[0]
    print(f'y={y}: dark line x at {[270+d for d in darks]}')
