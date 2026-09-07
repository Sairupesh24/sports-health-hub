import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_seamless():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Mask ONLY what needs to be replaced:
    # Upper pubic area: y from 458 to 490, x from 292 to 328
    # Center crotch/scrotum area: y from 490 to 501, x from 304 to 316 (ONLY the center between the thighs!)
    mask = np.zeros((h, w), dtype=bool)
    mask[458:490, 292:328] = True
    mask[490:501, 304:316] = True

    # Fill center area y=490..501 with white (since it becomes the white gap)
    temp_arr = arr.copy()
    
    # For the pubic mound (y: 458..490, x: 292..328), we do Laplace inpainting:
    # At y=490, the bottom boundary (x: 292..328) is set to smooth thigh skin:
    skin_col = np.array([239.0, 195.0, 171.0])
    temp_arr[490, 292:328] = skin_col

    for ch in range(3):
        c = temp_arr[:, :, ch].copy()
        # Inpaint only the upper pubic box
        m_pubic = mask.copy()
        m_pubic[490:, :] = False
        for it in range(350):
            c_up = np.roll(c, -1, axis=0)
            c_down = np.roll(c, 1, axis=0)
            c_left = np.roll(c, -1, axis=1)
            c_right = np.roll(c, 1, axis=1)
            laplace = (c_up + c_down + c_left + c_right) * 0.25
            c[m_pubic] = laplace[m_pubic]
        temp_arr[:, :, ch] = c

    base_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. 4x supersampling on the groin area
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

    # 3. White gap between thighs:
    # Connects to existing white gap at y=500 (which is at x=308..312)
    # At y=490: width is x=306..314 (center 310)
    # Arch at the top of the gap:
    arch_pts = []
    for theta in np.linspace(np.pi, 0, 25):
        cx = 310.0 - 4.0 * np.cos(theta)
        cy = 490.5 - 1.2 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    y_thigh = np.linspace(490.5, 510.0, 30)
    left_thigh = []
    right_thigh = []
    for y_val in y_thigh:
        if y_val <= 500:
            f = (y_val - 490.5) / 9.5
            lx = 306.0 + 1.0 * f
            rx = 314.0 - 1.0 * f
        else:
            f = (y_val - 500.0) / 10.0
            lx = 307.0 - 0.2 * f
            rx = 313.0 + 0.2 * f
        left_thigh.append(np.array([lx, y_val]))
        right_thigh.append(np.array([rx, y_val]))

    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # 4. Line art:
    line_col = (42, 20, 10, 255)

    # Inner thigh contours along the white gap:
    thigh_pts = [pt(p[0], p[1]) for p in left_thigh[::-1] + arch_pts + right_thigh]
    for i in range(len(thigh_pts) - 1):
        draw_line.line([thigh_pts[i], thigh_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # Natural, elegant `\_/` matching reference image 2:
    # Left curve: from (299, 479) curving down to (306, 489.5)
    # Right curve: from (321, 479) curving down to (314, 489.5)
    t = np.linspace(0, 1, 25)
    p_top_l = np.array([299.0, 479.0])
    p_bot_l = np.array([306.0, 489.5])
    c_mid_l = np.array([301.5, 486.0])
    left_u = [(1-s)**2 * p_top_l + 2*(1-s)*s * c_mid_l + s**2 * p_bot_l for s in t]

    p_top_r = np.array([321.0, 479.0])
    p_bot_r = np.array([314.0, 489.5])
    c_mid_r = np.array([318.5, 486.0])
    right_u = [(1-s)**2 * p_top_r + 2*(1-s)*s * c_mid_r + s**2 * p_bot_r for s in t]

    hires_ul = [pt(p[0], p[1]) for p in left_u]
    hires_ur = [pt(p[0], p[1]) for p in right_u]

    for i in range(len(hires_ul) - 1):
        alpha = int(255 * (0.2 + 0.8 * (i / len(hires_ul))))
        draw_line.line([hires_ul[i], hires_ul[i+1]], fill=(50, 25, 15, alpha), width=int(scale * 1.3))

    for i in range(len(hires_ur) - 1):
        alpha = int(255 * (0.2 + 0.8 * (i / len(hires_ur))))
        draw_line.line([hires_ur[i], hires_ur[i+1]], fill=(50, 25, 15, alpha), width=int(scale * 1.3))

    # Composite
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_seamless()
img.save('scratch/seamless_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/seamless_crop.png')
print("Saved scratch/seamless_male.jpg and scratch/seamless_crop.png")
