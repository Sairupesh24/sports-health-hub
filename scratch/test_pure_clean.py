import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_pure_clean():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Mask to remove penis, scrotum, and any dark genital lines/shadows:
    # Area: y from 458 to 499, x from 295 to 325
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 500):
        for x in range(295, 326):
            mask[y, x] = True

    # Fill bottom boundary of mask (y=500, x=295..325) with clean skin tone
    # so Laplace doesn't pull dark lines from below:
    # Average belly skin at y=456, x=300..320
    belly_skin = np.mean(arr[456, 300:321, :], axis=0) # [238.2, 194.1, 169.8]
    temp_arr = arr.copy()
    temp_arr[500, 295:326] = belly_skin

    # Laplace inpainting
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

    # 2. Draw directly on the full-size image (supersampled 4x across the whole image or large crop)
    # Let's do 4x supersampling on a generous crop that fades seamlessly:
    scale = 4
    x0, y0, x1, y1 = 260, 440, 360, 540
    crop = Image.fromarray(np.clip(temp_arr[y0:y1, x0:x1], 0, 255).astype(np.uint8)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)

    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    draw_white = ImageDraw.Draw(crop_hi)
    draw_line = ImageDraw.Draw(crop_hi)

    # White gap between legs:
    # Top apex of white gap: y = 490.0, x = 307..313
    # Inner thigh contours from y=490 down to y=540:
    # Left inner thigh at y=490 is 307.0, down to 306.8 at y=500, 305.5 at y=540
    # Right inner thigh at y=490 is 313.0, down to 313.2 at y=500, 314.5 at y=540

    arch_pts = []
    for theta in np.linspace(np.pi, 0, 25):
        cx = 310.0 - 3.0 * np.cos(theta)
        cy = 490.0 - 1.2 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    y_thigh = np.linspace(490.0, 540.0, 50)
    left_thigh = []
    right_thigh = []
    for y_val in y_thigh:
        if y_val <= 500:
            f = (y_val - 490.0) / 10.0
            lx = 307.0 - 0.2 * f
            rx = 313.0 + 0.2 * f
        else:
            f = (y_val - 500.0) / 40.0
            lx = 306.8 - 1.3 * f
            rx = 313.2 + 1.3 * f
        left_thigh.append(np.array([lx, y_val]))
        right_thigh.append(np.array([rx, y_val]))

    # Fill white gap strictly between left and right thigh
    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # Inner thigh and crotch contour line:
    line_col = (42, 20, 10, 255)
    # Left inner thigh up to arch and down right inner thigh:
    contour_pts = [pt(p[0], p[1]) for p in left_thigh[::-1] + arch_pts + right_thigh]
    for i in range(len(contour_pts) - 1):
        draw_line.line([contour_pts[i], contour_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # Downsample back to 1x
    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    # Blend crop_final seamlessly using an elliptical/smooth alpha mask
    mask_blend = Image.new('L', (x1 - x0, y1 - y0), 255)
    draw_mb = ImageDraw.Draw(mask_blend)
    # 4px margin fade
    mask_blend = mask_blend.filter(ImageFilter.GaussianBlur(3))

    orig_crop = orig.crop((x0, y0, x1, y1))
    blended = Image.composite(crop_final, orig_crop, mask_blend)

    final_img = orig.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_pure_clean()
img.save('scratch/pure_clean_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/pure_clean_crop.png')
print("Successfully generated pure_clean_male.jpg and pure_clean_crop.png")
