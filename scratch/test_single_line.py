import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def craft_single_line_modest():
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig).astype(np.float64)
    h, w, _ = arr.shape

    # 1. Clean the genital area:
    # Everything inside x: 288..332, y: 456..502
    mask = np.zeros((h, w), dtype=bool)
    mask[456:502, 288:332] = True

    temp_arr = arr.copy()
    clean_skin_color = np.array([240.0, 196.0, 172.0])
    temp_arr[502, 288:332] = clean_skin_color

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

    # In reference image 2 (media_1788778783469.png):
    # Crotch apex is a smooth rounded arch:
    # Top of the arch is at y = 490.0, center at x = 310.0
    # Left edge: x = 306.5
    # Right edge: x = 313.5
    # Width = 7px (matching the existing inner thigh separation at y=500)
    
    arch_pts = []
    for theta in np.linspace(np.pi, 0, 25):
        cx = 310.0 - 3.5 * np.cos(theta)
        cy = 490.0 - 1.5 * np.sin(theta)
        arch_pts.append(np.array([cx, cy]))

    y_thigh = np.linspace(490.0, 520.0, 40)
    left_thigh = [np.array([306.5, y]) for y in y_thigh]
    right_thigh = [np.array([313.5, y]) for y in y_thigh]

    # White gap between legs below the arch
    white_poly = [pt(p[0], p[1]) for p in arch_pts]
    for p in right_thigh:
        white_poly.append(pt(p[0], p[1]))
    for p in reversed(left_thigh):
        white_poly.append(pt(p[0], p[1]))
    
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # EXACTLY ONE single continuous contour line:
    line_col = (42, 20, 10, 255)
    contour_pts = [pt(p[0], p[1]) for p in left_thigh[::-1] + arch_pts + right_thigh]
    for i in range(len(contour_pts) - 1):
        draw_line.line([contour_pts[i], contour_pts[i+1]], fill=line_col, width=int(scale * 1.5))

    # Composite
    crop_hi = Image.alpha_composite(crop_hi, white_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))
    return final_img

img = craft_single_line_modest()
img.save('scratch/single_line_male.jpg', quality=95)
img.crop((250, 440, 350, 540)).save('scratch/single_line_crop.png')
print("Saved scratch/single_line_male.jpg and scratch/single_line_crop.png")
