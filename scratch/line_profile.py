from PIL import Image
import numpy as np

img = Image.open('public/body_male_front.jpg')
arr = np.array(img)

# Measure contour line at y=464, x=292:
print("Contour profile at y=464:")
for x in range(288, 297):
    print(f"  x={x}: {arr[464, x]}")

print("\nContour profile at y=510:")
for x in range(304, 316):
    print(f"  x={x}: {arr[510, x]}")
