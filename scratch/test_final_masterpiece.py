import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_masterpiece():
    # 1. Base inpainting
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # Mask from x=282 to 338, y=456 to 502
    mask = np.zeros((h, w), dtype=bool)
    mask[456:502, 282:338] = True

    # Skin color boundary at bottom
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

    base_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. Work in 4x supersampling on the groin area [460..520, 280..340]
    scale = 4
    x0, y0, x1, y1 = 280, 460, 340, 520
    crop = base_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    # We only draw:
    # A. The white background gap between legs (from y=490 down to y=520, between x=307 and 313)
    # B. The clean contour lines:
    #    - Left inner thigh from (307, 510) up to (307, 490)
    #    - Right inner thigh from (313, 510) up to (313, 490)
    #    - Rounded arch connecting (307, 490) to (313, 490)
    #    - Gentle crease `\_/` matching reference image 2:
    #      left crease: (295, 468) -> (301, 479) -> (307, 490)
    #      right crease: (325, 468) -> (319, 479) -> (313, 490)

    white_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_white = ImageDraw.Draw(white_layer)
    draw_line = ImageDraw.Draw(line_layer)

    # 1. White gap geometry:
    # Crotch arch top is at y = 490.0, center x = 310.0
    arch_pts = []
    for theta in np.linspace(np.pi, 0, 20):
        cx = 310.0 - 3.0 * np.cos(theta)
        cy = 490.0 - 1.2 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    y_thigh = np.linspace(490.0, 520.0, 40)
    left_thigh = [np.array([307.0, y]) for y in y_thigh]
    right_thigh = [np.array([313.0, y]) for y in y_thigh]

    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # 2. Line art:
    line_col = (42, 20, 10, 255)

    # Inner thigh and crotch arch:
    thigh_arch_pts = [pt(p[0], p[1]) for p in left_thigh[::-1] + arch_pts + right_thigh]
    for i in range(len(thigh_arch_pts) - 1):
        draw_line.line([thigh_arch_pts[i], thigh_arch_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # Gentle crease lines `\_/`:
    # Left: Bezier from (294, 466) -> (299, 477) -> (307, 490)
    # Right: Bezier from (326, 466) -> (321, 477) -> (313, 490)
    t = np.linspace(0, 1, 30)
    left_crease = [(1-s)**2 * np.array([294.0, 466.0]) + 2*(1-s)*s * np.array([299.0, 478.0]) + s**2 * np.array([307.0, 490.0]) for s in t]
    right_crease = [(1-s)**2 * np.array([326.0, 466.0]) + 2*(1-s)*s * np.array([321.0, 478.0]) + s**2 * np.array([313.0, 490.0]) for s in t]

    hires_cl = [pt(p[0], p[1]) for p in left_crease]
    hires_cr = [pt(p[0], p[1]) for p in right_crease]

    for i in range(len(hires_cl) - 1):
        alpha = int(255 * (0.4 + 0.6 * (i / len(hires_cl))))
        draw_line.line([hires_cl[i], hires_cl[i+1]], fill=(42, 20, 10, alpha), width=int(scale * 1.2))

    for i in range(len(hires_cr) - 1):
        alpha = int(255 * (0.4 + 0.6 * (i / len(hires_cr))))
        draw_line.line([hires_cr[i], hires_cr[i+1]], fill=(42, 20, 10, alpha), width=int(scale * 1.2))

    # Composite:
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_masterpiece()
img.save('scratch/masterpiece_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/masterpiece_crop.png')
print("Saved scratch/masterpiece_male.jpg and scratch/masterpiece_crop.png")
