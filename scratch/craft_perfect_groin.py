import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_clean_male():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Base skin tone estimation across the pubic mound
    # Let's inspect coordinates in full image:
    # Top of pubic area: y=455..458 (x: 290..330)
    # Left of pubic area: x=280..292 (y: 460..485)
    # Right of pubic area: x=328..340 (y: 460..485)
    
    # Let's create a smooth skin patch for the whole pubic box [456:495, 290:330]
    # We interpolate from the clean boundary pixels:
    # top_row = arr[456, 290:330]
    # left_col = arr[456:495, 290]
    # right_col = arr[456:495, 330]
    
    clean_arr = arr.copy()
    
    # Let's use harmonic inpainting on a generous mask covering all genitals and shadows
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 502):
        for x in range(292, 328):
            mask[y, x] = True

    # But we want the top boundary to be at y=456 (pure belly skin ~[238, 194, 170])
    # and bottom boundary (y=503) to NOT pull dark lines into the skin.
    # So for bottom boundary during skin relaxation, we set temporary skin values:
    temp_arr = clean_arr.copy()
    # Fill bottom row of mask area (y=502) with thigh skin color
    thigh_skin = np.array([238.0, 192.0, 168.0])
    temp_arr[502, 292:328] = thigh_skin
    
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

    base_skin_img = Image.fromarray(np.clip(temp_arr, 0, 255).astype(np.uint8))

    # 2. Vector rendering at 4x scale
    scale = 4
    x0, y0, x1, y1 = 250, 440, 360, 530
    crop = base_skin_img.crop((x0, y0, x1, y1)).convert('RGBA')
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
    # Crotch apex curve is at y = 489.5
    # Inner thigh line on left: x ≈ 306.8
    # Inner thigh line on right: x ≈ 313.2
    # Inguinal folds start at (294, 468) and (326, 468)

    # Let's generate points for smooth Bezier-like curve for the inner thigh / crotch arch:
    # Left inner thigh contour:
    # From y=520 up to apex (489.5)
    # Then rounded arch across from x=306.8 to 313.2 at y=489.5
    # Then down the right inner thigh to y=520
    
    # Also the groin crease lines coming from (294, 468) and (326, 468):
    # In reference image 2 (media_1788778783469.png):
    # The groin crease is a single continuous elegant curve that forms the pelvis contour:
    # Left side: starts around (294, 468) -> (297, 474) -> (301, 480) -> (305, 486) -> (307, 489.5)
    # Right side: starts around (326, 468) -> (323, 474) -> (319, 480) -> (315, 486) -> (313, 489.5)
    # Bottom apex: connects smoothly from 307 to 313 at y=489.5 with a rounded curve `\_/`
    
    # Construct curve points:
    # We'll use high-density sampling
    t_vals = np.linspace(0, 1, 100)
    
    # Left flank to apex Bezier:
    # P0 = (294, 468), P1 = (296, 478), P2 = (302, 487), P3 = (307, 489.5)
    p0 = np.array([294.0, 468.0])
    p1 = np.array([296.0, 477.0])
    p2 = np.array([301.5, 485.5])
    p3 = np.array([307.0, 489.5])
    left_curve = [(1-t)**3 * p0 + 3*(1-t)**2*t * p1 + 3*(1-t)*t**2 * p2 + t**3 * p3 for t in t_vals]

    # Right flank to apex Bezier:
    # Q0 = (326, 468), Q1 = (324, 478), Q2 = (318.5, 485.5), Q3 = (313, 489.5)
    q0 = np.array([326.0, 468.0])
    q1 = np.array([324.0, 477.0])
    q2 = np.array([318.5, 485.5])
    q3 = np.array([313.0, 489.5])
    right_curve = [(1-t)**3 * q0 + 3*(1-t)**2*t * q1 + 3*(1-t)*t**2 * q2 + t**3 * q3 for t in t_vals]

    # Bottom arch connecting P3 to Q3:
    # Circular arc from theta=pi to 0 centered at (310, 489.5 + 2)
    # or a soft catenary/parabola
    arch_t = np.linspace(np.pi, 0, 30)
    bottom_arch = [np.array([310.0 + 3.0 * np.cos(th), 490.5 - 1.0 * np.sin(th)]) for th in arch_t]

    # Inner thighs going down from the crotch:
    # Left inner thigh from (307, 489.5) down to (306.8, 525)
    # Right inner thigh from (313, 489.5) down to (313.2, 525)
    thigh_t = np.linspace(489.5, 525.0, 60)
    left_thigh = [np.array([307.0 - 0.2 * ((y - 489.5)/35.5), y]) for y in thigh_t]
    right_thigh = [np.array([313.0 + 0.2 * ((y - 489.5)/35.5), y]) for y in thigh_t]

    # 1. White gap between legs:
    white_poly_pts = [pt(p[0], p[1]) for p in bottom_arch]
    for p in right_thigh:
        white_poly_pts.append(pt(p[0], p[1]))
    white_poly_pts.append(pt(313.2, 530))
    white_poly_pts.append(pt(306.8, 530))
    for p in reversed(left_thigh):
        white_poly_pts.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly_pts, fill=(255, 255, 255, 255))

    # 2. Draw contour lines & soft ambient shading
    line_col = (46, 22, 12, 255)
    shadow_col = (212, 162, 138, 140)

    # Inguinal / Pelvis contour (left_curve -> bottom_arch -> reversed right_curve):
    full_pelvis_curve = left_curve + bottom_arch + list(reversed(right_curve))
    hires_pelvis = [pt(p[0], p[1]) for p in full_pelvis_curve]

    # Left inner thigh contour:
    hires_left_thigh = [pt(p[0], p[1]) for p in left_thigh]
    # Right inner thigh contour:
    hires_right_thigh = [pt(p[0], p[1]) for p in right_thigh]

    # Draw shadows along contours
    for i in range(len(hires_pelvis) - 1):
        draw_shadow.line([hires_pelvis[i], hires_pelvis[i+1]], fill=shadow_col, width=int(scale * 3.0))
    for i in range(len(hires_left_thigh) - 1):
        draw_shadow.line([hires_left_thigh[i], hires_left_thigh[i+1]], fill=shadow_col, width=int(scale * 3.0))
    for i in range(len(hires_right_thigh) - 1):
        draw_shadow.line([hires_right_thigh[i], hires_right_thigh[i+1]], fill=shadow_col, width=int(scale * 3.0))

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(scale * 0.7))

    # Draw lines
    for i in range(len(hires_pelvis) - 1):
        # Taper line width slightly towards the bottom
        draw_line.line([hires_pelvis[i], hires_pelvis[i+1]], fill=line_col, width=int(scale * 1.5))
    for i in range(len(hires_left_thigh) - 1):
        draw_line.line([hires_left_thigh[i], hires_left_thigh[i+1]], fill=line_col, width=int(scale * 1.5))
    for i in range(len(hires_right_thigh) - 1):
        draw_line.line([hires_right_thigh[i], hires_right_thigh[i+1]], fill=line_col, width=int(scale * 1.5))

    # Composite:
    # base skin -> white gap -> shadow -> line
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, shadow_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = orig.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_clean_male()
img.save('scratch/perfect_male_front.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/perfect_crop.png')
print("Successfully generated perfect_male_front.jpg and perfect_crop.png")
