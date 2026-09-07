import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_perfection():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Mask to clear all genital lines, penis, scrotum, and old groin crease fragments:
    # y: 456 to 498
    # x: 282 to 338 for y <= 492
    # For y between 492 and 498: mask any pixels that are darker than R < 220
    mask = np.zeros((h, w), dtype=bool)
    mask[456:492, 282:338] = True
    for y in range(492, 499):
        for x in range(290, 330):
            if arr[y, x, 0] < 225:
                mask[y, x] = True

    # Dilate mask by 2px to ensure all dark line fragments are covered
    m_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    mask = np.array(m_img) > 128
    # Don't let mask go below y=499 or outside x=280..340
    mask[499:, :] = False
    mask[:, :282] = False
    mask[:, 338:] = False

    temp_arr = arr.copy()
    # Bottom boundary at y=498 center (x: 304..316) set to thigh skin color
    temp_arr[498, 304:316] = [239.0, 195.0, 171.0]

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

    # Area y >= 496, x in 307..313 is the white gap between legs:
    for y in range(496, 502):
        for x in range(307, 313):
            temp_arr[y, x] = [255.0, 255.0, 255.0]

    base_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. 4x supersampling for the line art of `\_/` and inner thigh contours
    scale = 4
    x0, y0, x1, y1 = 285, 470, 335, 510
    crop = base_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_line = ImageDraw.Draw(line_layer)

    # Reference 2 `\_/` geometry:
    # Base horizontal line at y = 496.0, from x = 307.0 to x = 313.0
    # Left wing: curves from (299.0, 480.0) down to (307.0, 496.0)
    # Right wing: curves from (321.0, 480.0) down to (313.0, 496.0)
    # Left inner thigh contour: from (307.0, 496.0) down to (306.8, 503.0)
    # Right inner thigh contour: from (313.0, 496.0) down to (313.2, 503.0)

    t = np.linspace(0, 1, 30)
    p0_l = np.array([299.0, 480.0])
    p1_l = np.array([302.5, 489.0])
    p2_l = np.array([307.0, 496.0])
    left_wing = [(1-s)**2 * p0_l + 2*(1-s)*s * p1_l + s**2 * p2_l for s in t]

    p0_r = np.array([321.0, 480.0])
    p1_r = np.array([317.5, 489.0])
    p2_r = np.array([313.0, 496.0])
    right_wing = [(1-s)**2 * p0_r + 2*(1-s)*s * p1_r + s**2 * p2_r for s in t]

    bottom_seg = [np.array([x, 496.0]) for x in np.linspace(307.0, 313.0, 20)]

    left_leg = [np.array([307.0 - 0.2 * ((y - 496.0)/7.0), y]) for y in np.linspace(496.0, 503.0, 15)]
    right_leg = [np.array([313.0 + 0.2 * ((y - 496.0)/7.0), y]) for y in np.linspace(496.0, 503.0, 15)]

    # Colors:
    cup_col = (85, 50, 32, 255)
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
        draw_line.line([hires_lw[i], hires_lw[i+1]], fill=(85, 50, 32, alpha), width=int(scale * 1.3))

    # Draw right wing with fade at top
    for i in range(len(hires_rw) - 1):
        alpha = int(255 * (0.2 + 0.8 * ((len(hires_rw) - 1 - i) / len(hires_rw))))
        draw_line.line([hires_rw[i], hires_rw[i+1]], fill=(85, 50, 32, alpha), width=int(scale * 1.3))

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

img = craft_perfection()
img.save('scratch/perfection_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/perfection_crop.png')
print("Saved scratch/perfection_male.jpg and scratch/perfection_crop.png")
