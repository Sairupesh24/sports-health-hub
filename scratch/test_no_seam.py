import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_clean_skin_no_seam():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # Mask for upper pubic skin (y: 456 to 494, x: 282 to 338)
    mask = np.zeros((h, w), dtype=bool)
    mask[456:495, 282:338] = True

    # At row 495, the thighs (x: 282..305 and 315..338) have their natural values.
    # For the center of row 495 (x: 306..314), we provide a smooth skin boundary:
    temp_arr = arr.copy()
    temp_arr[495, 306:314] = [238.5, 194.5, 170.5]

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

    # Area y >= 495, x in 307..313 becomes pure white background gap:
    for y in range(495, 502):
        for x in range(307, 313):
            temp_arr[y, x] = [255.0, 255.0, 255.0]

    res_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))
    res_img.crop((250, 440, 350, 540)).save('scratch/test_no_seam.png')
    print("Saved scratch/test_no_seam.png")

craft_clean_skin_no_seam()
