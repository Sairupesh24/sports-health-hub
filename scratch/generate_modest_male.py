import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def generate_modest_male():
    # 1. Load original male front image
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 2. Smooth skin replacement for the pubic mound:
    # Everything inside the pubic region (x: 290..330, y: 457..502)
    # We want a clean, natural skin surface.
    # At y=456, the belly skin is around: [238, 194, 170]
    # At y=490, the thigh skin on the left (x=280) is: [240, 196, 172]
    # At y=490, the thigh skin on the right (x=340) is: [240, 196, 172]
    
    # We can create a pure skin canvas using 2D interpolation of the clean belly/thigh skin:
    clean_skin = orig.copy()
    skin_arr = np.array(clean_skin).astype(np.float64)

    # Inpaint the region to remove penis/scrotum completely
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 504):
        for x in range(290, 331):
            mask[y, x] = True

    # Temporary border condition at y=504: pure thigh skin
    skin_arr[504, 290:331] = [238.0, 193.0, 169.0]
    
    for ch in range(3):
        c = skin_arr[:, :, ch].copy()
        for it in range(400):
            c_up = np.roll(c, -1, axis=0)
            c_down = np.roll(c, 1, axis=0)
            c_left = np.roll(c, -1, axis=1)
            c_right = np.roll(c, 1, axis=1)
            laplace = (c_up + c_down + c_left + c_right) * 0.25
            c[mask] = laplace[mask]
        skin_arr[:, :, ch] = c

    base_skin = Image.fromarray(np.clip(skin_arr, 0, 255).astype(np.uint8))

    # 3. Supersampled line art and shading at 4x
    scale = 4
    x0, y0, x1, y1 = 250, 440, 370, 540
    crop = base_skin.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    # Layers
    white_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    shadow_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))

    draw_white = ImageDraw.Draw(white_layer)
    draw_shadow = ImageDraw.Draw(shadow_layer)
    draw_line = ImageDraw.Draw(line_layer)

    # Geometry:
    # Cap position: y = 489.0
    # Left cap corner: x = 306.0, y = 489.0
    # Right cap corner: x = 314.0, y = 489.0
    # Cap is a subtle horizontal / slight curved arch between (306.0, 489.0) and (314.0, 489.0)

    # Left pelvic line going UP from cap to existing inguinal line at (294, 468):
    # Smooth Bezier: (306.0, 489.0) -> (302.5, 481.0) -> (297.5, 474.0) -> (294.0, 468.0)
    t = np.linspace(0, 1, 60)
    p_cap_left = np.array([306.0, 489.0])
    p_ing_left = np.array([294.0, 468.0])
    c1_left = np.array([303.0, 481.0])
    c2_left = np.array([297.0, 474.0])
    left_pelvic = [(1-s)**3 * p_cap_left + 3*(1-s)**2*s * c1_left + 3*(1-s)*s**2 * c2_left + s**3 * p_ing_left for s in t]

    # Right pelvic line going UP from cap to existing inguinal line at (326, 468):
    # Smooth Bezier: (314.0, 489.0) -> (317.5, 481.0) -> (322.5, 474.0) -> (326.0, 468.0)
    p_cap_right = np.array([314.0, 489.0])
    p_ing_right = np.array([326.0, 468.0])
    c1_right = np.array([317.0, 481.0])
    c2_right = np.array([323.0, 474.0])
    right_pelvic = [(1-s)**3 * p_cap_right + 3*(1-s)**2*s * c1_right + 3*(1-s)*s**2 * c2_right + s**3 * p_ing_right for s in t]

    # Crotch cap curve connecting p_cap_left to p_cap_right:
    # Subtle downward arc or horizontal line
    cap_pts = []
    for s in np.linspace(0, np.pi, 20):
        cx = 310.0 - 4.0 * np.cos(s)
        cy = 489.0 + 0.6 * np.sin(s)
        cap_pts.append(np.array([cx, cy]))

    # Inner thigh lines going DOWN into legs:
    # Left inner thigh from (306.0, 489.0) down to (306.8, 500) and (305.5, 540)
    # Right inner thigh from (314.0, 489.0) down to (313.2, 500) and (314.5, 540)
    y_thigh = np.linspace(489.0, 540.0, 60)
    left_thigh = []
    right_thigh = []
    for y_val in y_thigh:
        if y_val <= 500:
            f = (y_val - 489.0) / 11.0
            lx = 306.0 + 0.8 * f
            rx = 314.0 - 0.8 * f
        else:
            f = (y_val - 500.0) / 40.0
            lx = 306.8 - 1.3 * f
            rx = 313.2 + 1.3 * f
        left_thigh.append(np.array([lx, y_val]))
        right_thigh.append(np.array([rx, y_val]))

    # White background between legs:
    white_poly = [pt(p[0], p[1]) for p in cap_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    white_poly.append(pt(x1, y1))
    white_poly.append(pt(x0, y1))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    # Restrict white polygon strictly between the two thighs:
    white_polygon_strict = [pt(p[0], p[1]) for p in cap_pts]
    for p in right_thigh:
        white_polygon_strict.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_polygon_strict.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_polygon_strict, fill=(255, 255, 255, 255))

    # Shading along contours:
    # In female image, the inner thighs have a vertical shadow gradient:
    # Left inner thigh shadow (on the thigh side, i.e. x < lx)
    # Right inner thigh shadow (on the thigh side, i.e. x > rx)
    # And a subtle triangle in the V of the groin
    shadow_col = (208, 158, 134, 150)
    line_col = (42, 20, 10, 255)

    # Draw shadows along thigh lines (width ~4px in 1x scale -> 16px in 4x)
    for pts in [left_pelvic, right_pelvic, cap_pts, left_thigh, right_thigh]:
        hires_pts = [pt(p[0], p[1]) for p in pts]
        for i in range(len(hires_pts) - 1):
            draw_shadow.line([hires_pts[i], hires_pts[i+1]], fill=shadow_col, width=int(scale * 3.2))

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(scale * 0.9))

    # Draw lines (width 1.5px in 1x scale -> 6px in 4x)
    for pts in [left_pelvic, right_pelvic, cap_pts, left_thigh, right_thigh]:
        hires_pts = [pt(p[0], p[1]) for p in pts]
        for i in range(len(hires_pts) - 1):
            draw_line.line([hires_pts[i], hires_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # Composite: base -> white gap -> shadow -> line
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, shadow_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = orig.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = generate_modest_male()
img.save('scratch/modest_male_front.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/modest_crop.png')
print("Successfully generated scratch/modest_male_front.jpg and scratch/modest_crop.png")
