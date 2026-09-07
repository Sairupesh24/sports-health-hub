import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_surgical_exact():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Mask ONLY the penis and scrotum:
    # y: 458 to 488, x: 296 to 324 (penis)
    # y: 488 to 500, x: 305 to 315 (scrotum)
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 488):
        for x in range(296, 325):
            mask[y, x] = True
    for y in range(488, 501):
        for x in range(304, 316):
            mask[y, x] = True

    # Inpaint only the upper pubic area (y < 495) with smooth skin
    # Bottom boundary at y=495 (x: 304..316) set to surrounding skin
    temp_arr = arr.copy()
    skin_val = np.array([238.5, 194.5, 170.5])
    temp_arr[495, 304:316] = skin_val

    m_skin = mask.copy()
    m_skin[495:, :] = False

    for ch in range(3):
        c = temp_arr[:, :, ch].copy()
        for it in range(350):
            c_up = np.roll(c, -1, axis=0)
            c_down = np.roll(c, 1, axis=0)
            c_left = np.roll(c, -1, axis=1)
            c_right = np.roll(c, 1, axis=1)
            laplace = (c_up + c_down + c_left + c_right) * 0.25
            c[m_skin] = laplace[m_skin]
        temp_arr[:, :, ch] = c

    # Area y >= 495, x in 305..315 becomes white gap
    for y in range(495, 501):
        for x in range(307, 313):
            temp_arr[y, x] = [255.0, 255.0, 255.0]

    base_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. 4x supersampling on a small box just around the crotch arch [475..505, 295..325]
    scale = 4
    x0, y0, x1, y1 = 292, 476, 328, 506
    crop = base_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_line = ImageDraw.Draw(line_layer)

    # Clean `\_/` matching reference image 2:
    # Left wing: starts at (299.0, 480.0), curves down to (306.5, 495.0)
    # Right wing: starts at (321.0, 480.0), curves down to (313.5, 495.0)
    # Horizontal bottom: connects (306.5, 495.0) to (313.5, 495.0)
    t = np.linspace(0, 1, 30)
    p0_l = np.array([299.0, 480.0])
    p1_l = np.array([302.5, 488.5])
    p2_l = np.array([306.5, 495.0])
    left_wing = [(1-s)**2 * p0_l + 2*(1-s)*s * p1_l + s**2 * p2_l for s in t]

    p0_r = np.array([321.0, 480.0])
    p1_r = np.array([317.5, 488.5])
    p2_r = np.array([313.5, 495.0])
    right_wing = [(1-s)**2 * p0_r + 2*(1-s)*s * p1_r + s**2 * p2_r for s in t]

    bottom_seg = [np.array([x, 495.0]) for x in np.linspace(306.5, 313.5, 20)]

    # Inner thigh connection from y=495 to y=502:
    left_leg = [np.array([306.5, y]) for y in np.linspace(495.0, 502.0, 15)]
    right_leg = [np.array([313.5, y]) for y in np.linspace(495.0, 502.0, 15)]

    # Draw lines
    cup_col = (75, 45, 30, 255)
    leg_col = (42, 20, 10, 255)

    hires_lw = [pt(p[0], p[1]) for p in left_wing]
    hires_bot = [pt(p[0], p[1]) for p in bottom_seg]
    hires_rw = [pt(p[0], p[1]) for p in right_wing]
    hires_ll = [pt(p[0], p[1]) for p in left_leg]
    hires_rl = [pt(p[0], p[1]) for p in right_leg]

    # Draw bottom horizontal line
    for i in range(len(hires_bot) - 1):
        draw_line.line([hires_bot[i], hires_bot[i+1]], fill=cup_col, width=int(scale * 1.5))

    # Draw left wing with fade at top
    for i in range(len(hires_lw) - 1):
        alpha = int(255 * (0.2 + 0.8 * (i / len(hires_lw))))
        draw_line.line([hires_lw[i], hires_lw[i+1]], fill=(75, 45, 30, alpha), width=int(scale * 1.3))

    # Draw right wing with fade at top
    for i in range(len(hires_rw) - 1):
        alpha = int(255 * (0.2 + 0.8 * ((len(hires_rw) - 1 - i) / len(hires_rw))))
        draw_line.line([hires_rw[i], hires_rw[i+1]], fill=(75, 45, 30, alpha), width=int(scale * 1.3))

    # Draw inner thigh lines
    for i in range(len(hires_ll) - 1):
        draw_line.line([hires_ll[i], hires_ll[i+1]], fill=leg_col, width=int(scale * 1.5))
    for i in range(len(hires_rl) - 1):
        draw_line.line([hires_rl[i], hires_rl[i+1]], fill=leg_col, width=int(scale * 1.5))

    crop_hi = Image.alpha_composite(crop_hi, line_layer)
    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_surgical_exact()
img.save('scratch/surgical_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/surgical_crop.png')
print("Saved scratch/surgical_male.jpg and scratch/surgical_crop.png")
