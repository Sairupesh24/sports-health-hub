from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

# Let's inspect the skin gradient above the genitals (e.g. y=430 to 455, x=270 to 330)
sample_y = 445
print(f"Skin colors at y={sample_y} across x=280..320:")
for x in range(280, 321, 5):
    print(f"  x={x}: {arr[sample_y, x]}")

# Let's check the line colors of the inguinal folds (at x=285 and x=325 at y=450)
print("\nInguinal fold colors:")
print("Left fold around y=450, x=280..290:")
for x in range(280, 290):
    if arr[450, x, 0] < 120:
        print(f"  x={x}: {arr[450, x]}")

print("Right fold around y=450, x=320..330:")
for x in range(320, 330):
    if arr[450, x, 0] < 120:
        print(f"  x={x}: {arr[450, x]}")
