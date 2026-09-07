import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_clean_figure():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Clean the genital area:
    # Look at the coordinates of the penis and scrotum in the original image:
    # y: from 458 to 499
    # x: from 296 to 324
    
    # We want to inpaint this exact rectangle/polygon so that the skin of the lower abdomen
    # and inner thighs blends across seamlessly without any lines or genitals.
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 500):
        for x in range(296, 325):
            mask[y, x] = True

    # For the inpainting, we fix the boundary values:
    # Top (y=457, x=296..324): pure belly skin [238, 194, 170]
    # Left (x=295, y=458..499): thigh skin
    # Right (x=325, y=458..499): thigh skin
    # Bottom (y=500, x=296..324): set to clean thigh skin [238, 194, 170] for smooth skin interpolation
    temp_arr = arr.copy()
    temp_arr[500, 296:325] = [238.0, 194.0, 170.0]

    # Laplace relaxation
    for ch in range(3):
        c = temp_arr[:, :, ch].copy()
        for it in range(350):
            c_up = np.roll(c, -1, axis=0)
            c_down = np.roll(c, 1, axis=0)
            c_left = np.roll(c, -1, axis=1)
            c_right = np.roll(c, 1, axis=1)
            laplace = (c_up + c_down + c_left + c_right) * 0.25
            c[mask] = laplace[mask]
        temp_arr[:, :, ch] = c

    res_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. Now supersample crop around groin for vector-smooth line art & white gap
    scale = 4
    x0, y0, x1, y1 = 280, 460, 340, 520
    crop = res_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    # 3. White gap extension:
    # Existing white gap is at y >= 500, x from 308 to 312.
    # We extend it up to y = 488.
    # At y = 488, the crotch cap connects x=307 to x=313.
    white_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_white = ImageDraw.Draw(white_layer)

    # Rounded arch at the top of the gap (y=488, x=307..313)
    arch_pts = []
    for theta in np.linspace(np.pi, 0, 20):
        cx = 310.0 - 3.0 * np.cos(theta)
        cy = 488.5 - 1.2 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    # Inner thigh edges from y=488.5 down to y=505 (where it connects to existing lines)
    left_edge = [np.array([307.0, y]) for y in np.linspace(488.5, 505.0, 30)]
    right_edge = [np.array([313.0, y]) for y in np.linspace(488.5, 505.0, 30)]

    # Polygon of white space:
    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_edge:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_edge):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # 4. Line art & shadow:
    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    shadow_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_line = ImageDraw.Draw(line_layer)
    draw_shadow = ImageDraw.Draw(shadow_layer)

    line_col = (42, 20, 10, 255)
    shadow_col = (210, 160, 135, 140)

    # Contour along the inner thighs and the arch:
    contour_pts = [pt(p[0], p[1]) for p in left_edge[::-1] + arch_pts + right_edge]

    # Also subtle crease line in the groin `\_/` matching reference image 2:
    # Left groin crease: from (298, 474) curving gently into (307, 488.5)
    # Right groin crease: from (322, 474) curving gently into (313, 488.5)
    t = np.linspace(0, 1, 30)
    left_crease = [(1-s)**2 * np.array([298.0, 474.0]) + 2*(1-s)*s * np.array([301.0, 483.0]) + s**2 * np.array([307.0, 488.5]) for s in t]
    right_crease = [(1-s)**2 * np.array([322.0, 474.0]) + 2*(1-s)*s * np.array([319.0, 483.0]) + s**2 * np.array([313.0, 488.5]) for s in t]

    hires_crease_l = [pt(p[0], p[1]) for p in left_crease]
    hires_crease_r = [pt(p[0], p[1]) for p in right_crease]

    # Draw shadows
    for i in range(len(contour_pts) - 1):
        draw_shadow.line([contour_pts[i], contour_pts[i+1]], fill=shadow_col, width=int(scale * 3.0))
    for i in range(len(hires_crease_l) - 1):
        alpha = int(140 * (i / len(hires_crease_l)))
        draw_shadow.line([hires_crease_l[i], hires_crease_l[i+1]], fill=(210, 160, 135, alpha), width=int(scale * 2.5))
    for i in range(len(hires_crease_r) - 1):
        alpha = int(140 * (i / len(hires_crease_r)))
        draw_shadow.line([hires_crease_r[i], hires_crease_r[i+1]], fill=(210, 160, 135, alpha), width=int(scale * 2.5))

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(scale * 0.7))

    # Draw lines
    for i in range(len(contour_pts) - 1):
        draw_line.line([contour_pts[i], contour_pts[i+1]], fill=line_col, width=int(scale * 1.5))
    for i in range(len(hires_crease_l) - 1):
        alpha = int(255 * (i / len(hires_crease_l)))
        draw_line.line([hires_crease_l[i], hires_crease_l[i+1]], fill=(42, 20, 10, alpha), width=int(scale * 1.2))
    for i in range(len(hires_crease_r) - 1):
        alpha = int(255 * (i / len(hires_crease_r)))
        draw_line.line([hires_crease_r[i], hires_crease_r[i+1]], fill=(42, 20, 10, alpha), width=int(scale * 1.2))

    # Composite
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, shadow_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = res_img.copy()
    final_img.paste(crop_final, (x0, y0))

    return final_img

img = craft_clean_figure()
img.save('scratch/clean_male_front.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/clean_crop.png')
print("Saved scratch/clean_male_front.jpg and scratch/clean_crop.png")
