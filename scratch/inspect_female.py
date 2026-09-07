from PIL import Image
import numpy as np

img = Image.open('public/body_female_front.jpg')
arr = np.array(img)

print("Female image size:", img.size)
for y in range(460, 520, 2):
    row = arr[y, 280:320]
    whites = np.where((row[:,0]>250) & (row[:,1]>250) & (row[:,2]>250))[0]
    if len(whites) > 0:
        print(f'y={y}: white x from {280+whites[0]} to {280+whites[-1]}')
    else:
        min_c = row.min(axis=0)
        print(f'y={y}: no white, min={min_c}')
