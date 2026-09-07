import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_exact_ref():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Clean the genital area:
    # Remove penis, scrotum, and all genitals between x=286..334, y=456..502
    mask = np.zeros((h, w), dtype=bool)
    mask[456:501, 286:334] = True

    temp_arr = arr.copy()
    clean_skin_color = np.array([240.0, 196.0, 172.0])
    temp_arr[501, 286:334] = clean_skin_color

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

    # 2. 4x supersampling on groin
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

    # 3. White gap between thighs below the horizontal base of the `\_/`:
    # Base is at y = 495.0, from x = 307.0 to x = 313.0
    # Left inner thigh contour goes down from (307.0, 495.0) to (306.8, 502.0) and continues into original
    # Right inner thigh contour goes down from (313.0, 495.0) to (313.2, 502.0) and continues into original
    y_leg = np.linspace(495.0, 520.0, 30)
    left_leg = [np.array([307.0 - 0.2 * ((y - 495.0)/25.0), y]) for y in y_leg]
    right_leg = [np.array([313.0 + 0.2 * ((y - 495.0)/25.0), y]) for y in y_leg]

    white_poly = [
        pt(307.0, 495.5),
        pt(313.0, 495.5),
    ] + [pt(p[0], p[1]) for p in right_leg] + [pt(p[0], p[1]) for p in reversed(left_leg)]

    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # 4. Draw the exact `\_/` matching reference image 2:
    # Shape of `\_/`:
    # Top left wing: (301.5, 482.0)
    # Bottom left corner: (306.5, 495.0)
    # Horizontal bottom: connects (306.5, 495.0) to (313.5, 495.0)
    # Bottom right corner: (313.5, 495.0)
    # Top right wing: (318.5, 482.0)

    # Curve for left wing (smooth gentle curve inwards)
    t = np.linspace(0, 1, 30)
    p0_l = np.array([301.5, 482.0])
    p1_l = np.array([304.0, 489.0])
    p2_l = np.array([306.5, 495.0])
    left_wing = [(1-s)**2 * p0_l + 2*(1-s)*s * p1_l + s**2 * p2_l for s in t]

    p0_r = np.array([318.5, 482.0])
    p1_r = np.array([316.0, 489.0])
    p2_r = np.array([313.5, 495.0])
    right_wing = [(1-s)**2 * p0_r + 2*(1-s)*s * p1_r + s**2 * p2_r for s in t]

    # Horizontal bottom segment
    bottom_seg = [np.array([x, 495.0]) for x in np.linspace(306.5, 313.5, 20)]

    # Draw inner thigh lines along the white gap:
    line_col = (42, 20, 10, 255)
    
    hires_left_leg = [pt(p[0], p[1]) for p in left_leg]
    hires_right_leg = [pt(p[0], p[1]) for p in right_leg]
    for i in range(len(hires_left_leg) - 1):
        draw_line.line([hires_left_leg[i], hires_left_leg[i+1]], fill=line_col, width=int(scale * 1.5))
    for i in range(len(hires_right_leg) - 1):
        draw_line.line([hires_right_leg[i], hires_right_leg[i+1]], fill=line_col, width=int(scale * 1.5))

    # Draw the `\_/` contour:
    # Soft warm brown line matching reference image 2:
    cup_col = (75, 45, 30, 255)
    hires_lw = [pt(p[0], p[1]) for p in left_wing]
    hires_bot = [pt(p[0], p[1]) for p in bottom_seg]
    hires_rw = [pt(p[0], p[1]) for p in right_wing]

    # Draw horizontal bottom:
    for i in range(len(hires_bot) - 1):
        draw_line.line([hires_bot[i], hires_bot[i+1]], fill=cup_col, width=int(scale * 1.5))

    # Draw left wing with fade at top:
    for i in range(len(hires_lw) - 1):
        alpha = int(255 * (0.2 + 0.8 * (i / len(hires_lw))))
        draw_line.line([hires_lw[i], hires_lw[i+1]], fill=(75, 45, 30, alpha), width=int(scale * 1.3))

    # Draw right wing with fade at top:
    for i in range(len(hires_rw) - 1):
        alpha = int(255 * (0.2 + 0.8 * ((len(hires_rw) - 1 - i) / len(hires_rw))))
        draw_line.line([hires_rw[i], hires_rw[i+1]], fill=(75, 45, 30, alpha), width=int(scale * 1.3))

    # Composite:
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_exact_ref()
img.save('scratch/exact_ref_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/exact_ref_crop.png')
print("Saved scratch/exact_ref_male.jpg and scratch/exact_ref_crop.png")
