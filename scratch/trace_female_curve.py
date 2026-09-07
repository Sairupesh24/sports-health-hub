from PIL import Image
import numpy as np

img = Image.open('scratch/female_groin_crop.png')
arr = np.array(img)

print("Female groin contour trace:")
for y in range(15, 60, 2):
    row = arr[y, :, 0]
    # find local minima of row where value < 130
    minima = []
    for x in range(25, 75):
        if row[x] < 140:
            if row[x] <= row[x-1] and row[x] <= row[x+1]:
                minima.append((x, int(row[x])))
    print(f"y={y}: minima={minima}")
