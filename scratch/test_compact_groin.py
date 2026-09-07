import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_compact_groin():
    # 1. Base inpainting starting from original
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # Mask: x from 282 to 338, y from 456 to 502
    mask = np.zeros((h, w), dtype=bool)
    mask[456:502, 282:338] = True

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

    # 2. 4x supersampling crop
    scale = 4
    x0, y0, x1, y1 = 280, 460, 340, 520
    crop = base_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    white_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_white = ImageDraw.Draw(white_layer)
    draw_line = ImageDraw.Draw(line_layer)

    # Crotch base arch: y = 490.5
    # Rounded bottom between x = 306.5 and x = 313.5
    arch_pts = []
    for theta in np.linspace(np.pi, 0, 25):
        cx = 310.0 - 3.5 * np.cos(theta)
        cy = 490.5 - 1.2 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    # Inner thighs going down to y=520
    y_thigh = np.linspace(490.5, 520.0, 40)
    left_thigh = [np.array([306.5, y]) for y in y_thigh]
    right_thigh = [np.array([313.5, y]) for y in y_thigh]

    # White gap
    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # Contour lines:
    line_col = (42, 20, 10, 255)

    # 1. Inner thigh lines down the legs
    thigh_pts = [pt(p[0], p[1]) for p in left_thigh[::-1] + arch_pts + right_thigh]
    for i in range(len(thigh_pts) - 1):
        draw_line.line([thigh_pts[i], thigh_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # 2. Compact, elegant rounded `\_/` matching reference image 2:
    # Left side: from (303, 482) curving down to (306.5, 489.5)
    # Right side: from (317, 482) curving down to (313.5, 489.5)
    t = np.linspace(0, 1, 25)
    p_top_l = np.array([303.0, 482.0])
    p_bot_l = np.array([306.5, 489.5])
    c_mid_l = np.array([304.5, 486.5])
    left_u = [(1-s)**2 * p_top_l + 2*(1-s)*s * c_mid_l + s**2 * p_bot_l for s in t]

    p_top_r = np.array([317.0, 482.0])
    p_bot_r = np.array([313.5, 489.5])
    c_mid_r = np.array([315.5, 486.5])
    right_u = [(1-s)**2 * p_top_r + 2*(1-s)*s * c_mid_r + s**2 * p_bot_r for s in t]

    hires_ul = [pt(p[0], p[1]) for p in left_u]
    hires_ur = [pt(p[0], p[1]) for p in right_u]

    # Draw with gentle fade at the top
    for i in range(len(hires_ul) - 1):
        alpha = int(255 * (0.3 + 0.7 * (i / len(hires_ul))))
        draw_line.line([hires_ul[i], hires_ul[i+1]], fill=(60, 35, 20, alpha), width=int(scale * 1.2))

    for i in range(len(hires_ur) - 1):
        alpha = int(255 * (0.3 + 0.7 * (i / len(hires_ur))))
        draw_line.line([hires_ur[i], hires_ur[i+1]], fill=(60, 35, 20, alpha), width=int(scale * 1.2))

    # Composite
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_compact_groin()
img.save('scratch/compact_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/compact_crop.png')
print("Saved scratch/compact_male.jpg and scratch/compact_crop.png")
