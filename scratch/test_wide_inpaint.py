import numpy as np
from PIL import Image

orig = Image.open('public/body_male_front.jpg').convert('RGB')
arr = np.array(orig).astype(np.float64)
h, w, _ = arr.shape

# Mask from x=282 to 338, y=456 to 502
mask = np.zeros((h, w), dtype=bool)
mask[456:502, 282:338] = True

# Also ensure bottom row (502) has skin values across x=282..338
temp_arr = arr.copy()
clean_skin_color = np.array([240.0, 196.0, 172.0])
temp_arr[502, 282:338] = clean_skin_color

for ch in range(3):
    c = temp_arr[:, :, ch].copy()
    for it in range(400):
        c_up = np.roll(c, -1, axis=0)
        c_down = np.roll(c, 1, axis=0)
        c_left = np.roll(c, -1, axis=1)
        c_right = np.roll(c, 1, axis=1)
        laplace = (c_up + c_down + c_left + c_right) * 0.25
        c[mask] = laplace[mask]
    temp_arr[:, :, ch] = c

clean_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))
clean_img.crop((250, 440, 350, 540)).save('scratch/test_wide_inpaint.png')
print("Saved scratch/test_wide_inpaint.png")
