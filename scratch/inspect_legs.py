from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

for y in range(480, 540, 2):
    row = arr[y, 280:320]
    whites = np.where((row[:,0]>250) & (row[:,1]>250) & (row[:,2]>250))[0]
    if len(whites) > 0:
        print(f'y={y}: white x from {280+whites[0]} to {280+whites[-1]}')
    else:
        print(f'y={y}: no white, min={row.min(axis=0)}, max={row.max(axis=0)}')
