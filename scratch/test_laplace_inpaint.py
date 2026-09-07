import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# 1. Load original image
img = Image.open('public/body_male_front.jpg').convert('RGB')
arr = np.array(img, dtype=np.float32)

# Create a mask for the region to clear/reconstruct
# In original coordinates:
# x from 292 to 328
# y from 458 to 498
# Everything inside this polygon needs genital lines removed and replaced with smooth skin.

# Let's inspect the surrounding skin colors:
# Left flank skin (x=285..293, y=460..485)
# Right flank skin (x=327..335, y=460..485)
# Upper abdomen skin (x=295..325, y=450..458)
# Lower thigh skin (x=280..295, y=490..505 and x=325..340, y=490..505)

# We can perform smooth biharmonic / Laplacian inpainting or radial basis interpolation
# on the genital area to achieve a perfectly continuous skin gradient.

h, w, _ = arr.shape
mask = np.zeros((h, w), dtype=bool)

# Define polygon of genital area to replace
# (x, y) coordinates
poly = [
    (296, 458),
    (324, 458),
    (324, 474),
    (320, 485),
    (314, 493),
    (313, 500),
    (307, 500),
    (306, 493),
    (300, 485),
    (296, 474),
]

mask_img = Image.new('L', (w, h), 0)
draw_mask = ImageDraw.Draw(mask_img)
draw_mask.polygon(poly, fill=255)
mask = np.array(mask_img) > 128

# Let's also include any pixels inside x:295..325, y:458..500 that have dark line art (< 140) or scrotal shading
for y in range(458, 501):
    for x in range(295, 326):
        if arr[y, x, 0] < 200 or (y > 480 and arr[y, x, 0] < 230):
            mask[y, x] = True

# Also dilate mask slightly by 2px
mask_img_dilated = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
mask = np.array(mask_img_dilated) > 128

print("Total mask pixels to inpaint:", np.sum(mask))

# We will solve Laplace equation (Dirichlet boundary conditions) on the masked region:
# For each channel, del^2 C = 0 on masked pixels, with fixed values on boundary.
result = arr.copy()

# Iterative Jacobi relaxation for Laplace equation
print("Relaxing skin gradient...")
for ch in range(3):
    c = result[:, :, ch].copy()
    for it in range(300):
        c_up = np.roll(c, -1, axis=0)
        c_down = np.roll(c, 1, axis=0)
        c_left = np.roll(c, -1, axis=1)
        c_right = np.roll(c, 1, axis=1)
        laplace = (c_up + c_down + c_left + c_right) * 0.25
        c[mask] = laplace[mask]
    result[:, :, ch] = c

# Now result has perfectly seamless skin tones!
res_img = Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))

# Now let's draw the clean anatomical features:
# 1. White gap between thighs from y=490 to y=500 between x=307 and x=313
# 2. Smooth inner thigh lines and gentle crotch arch
draw = ImageDraw.Draw(res_img)

# White gap between legs:
# Between x=308 and 312 from y=491 down to 502
for y in range(491, 502):
    # Width of white gap expands slightly downward:
    # At y=491: x=309..311
    # At y=500: x=308..312
    t = (y - 491) / (500 - 491)
    x1 = int(round(309 - t * 1))
    x2 = int(round(311 + t * 1))
    for x in range(x1, x2 + 1):
        res_img.putpixel((x, y), (255, 255, 255))

# Save intermediate
res_img.save('scratch/inpainted_skin.png')
print("Saved scratch/inpainted_skin.png")
