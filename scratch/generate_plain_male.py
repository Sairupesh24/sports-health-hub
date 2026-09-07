import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def make_plain_groin(fade_inguinal=True, crotch_apex_y=490):
    # 1. Start from original image
    orig = Image.open('public/body_male_front.jpg').convert('RGB')
    arr = np.array(orig, dtype=np.float32)
    h, w, _ = arr.shape

    # 2. Mask the genital area for biharmonic / Laplace relaxation
    # Area to clear: x from 293 to 327, y from 458 to 500
    mask = np.zeros((h, w), dtype=bool)
    for y in range(458, 501):
        for x in range(293, 328):
            mask[y, x] = True

    # Laplace relaxation for smooth skin tone
    result = arr.copy()
    for ch in range(3):
        c = result[:, :, ch].copy()
        for it in range(350):
            c_up = np.roll(c, -1, axis=0)
            c_down = np.roll(c, 1, axis=0)
            c_left = np.roll(c, -1, axis=1)
            c_right = np.roll(c, 1, axis=1)
            laplace = (c_up + c_down + c_left + c_right) * 0.25
            c[mask] = laplace[mask]
        result[:, :, ch] = c

    base_img = Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))

    # 3. Work in 4x supersampled resolution for subpixel line art and shading
    scale = 4
    x0, y0, x1, y1 = 260, 440, 360, 530
    crop = base_img.crop((x0, y0, x1, y1)).convert('RGBA')
    crop_hi = crop.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.Resampling.LANCZOS)
    
    # Overlay canvas for drawing lines and shadows
    line_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_line = ImageDraw.Draw(line_layer)

    shadow_layer = Image.new('RGBA', crop_hi.size, (0, 0, 0, 0))
    draw_shadow = ImageDraw.Draw(shadow_layer)

    # Function to convert full-img coordinates to hires crop coordinates
    def pt(x, y):
        return ((x - x0) * scale, (y - y0) * scale)

    # Line color and shadow color
    line_color = (48, 24, 12, 255)  # Dark brown contour matching original
    shadow_color = (210, 160, 135, 160) # Warm ambient shadow

    # The existing inguinal fold ends at (294, 468) on left, (326, 468) on right.
    # The existing inner thigh lines are at (307, 500) on left, (313, 500) on right.
    # Apex of crotch: between x=307 and 313 at y = crotch_apex_y (e.g. 489..491)

    # Inner thigh contours curving up to crotch apex:
    # Left inner thigh contour:
    # Points from (307, 515) -> (307, 500) -> (306.5, 495) -> (307, crotch_apex_y) -> (310, crotch_apex_y - 1)
    # Right inner thigh contour:
    # Points from (313, 515) -> (313, 500) -> (313.5, 495) -> (313, crotch_apex_y) -> (310, crotch_apex_y - 1)

    # 1. White gap polygon between the legs:
    # From crotch_apex_y down to y1
    white_poly = [
        pt(307, crotch_apex_y + 0.5),
        pt(310, crotch_apex_y - 0.5),
        pt(313, crotch_apex_y + 0.5),
        pt(313.5, 495),
        pt(313, 500),
        pt(314, 515),
        pt(314, 530),
        pt(306, 530),
        pt(306, 515),
        pt(307, 500),
        pt(306.5, 495),
    ]
    draw_white = ImageDraw.Draw(crop_hi)
    draw_white.polygon(white_poly, fill=(255, 255, 255, 255))

    # 2. Smooth inner thigh & crotch arch line:
    # We construct a smooth spline / list of points
    arch_pts = []
    # Left leg coming up
    for y in np.linspace(515, crotch_apex_y + 2, 20):
        # x is 307 with tiny inward taper
        arch_pts.append(pt(307.0, y))
    
    # Crotch curve across top of white gap:
    # Parabola or circular arc from (307, apex+2) up to (310, apex) to (313, apex+2)
    for theta in np.linspace(np.pi, 0, 15):
        cx = 310.0 + 3.0 * np.cos(theta)
        cy = (crotch_apex_y + 1.5) - 1.5 * np.sin(theta)
        arch_pts.append(pt(cx, cy))
    
    # Right leg going down
    for y in np.linspace(crotch_apex_y + 2, 515, 20):
        arch_pts.append(pt(313.0, y))

    # Draw shadow along inner thigh
    for i in range(len(arch_pts) - 1):
        draw_shadow.line([arch_pts[i], arch_pts[i+1]], fill=shadow_color, width=int(scale * 3.5))

    # Draw contour line
    for i in range(len(arch_pts) - 1):
        draw_line.line([arch_pts[i], arch_pts[i+1]], fill=line_color, width=int(scale * 1.5))

    # 3. Inguinal creases
    if fade_inguinal:
        # Taper the existing lines from 468 down to ~476 towards the pubis gently
        left_ing = [pt(294, 468), pt(295.5, 471), pt(297.5, 474), pt(300, 476)]
        right_ing = [pt(326, 468), pt(324.5, 471), pt(322.5, 474), pt(320, 476)]
        
        for i in range(len(left_ing) - 1):
            alpha = int(255 * (1.0 - i / len(left_ing)))
            draw_line.line([left_ing[i], left_ing[i+1]], fill=(48, 24, 12, alpha), width=int(scale * 1.3))
            draw_shadow.line([left_ing[i], left_ing[i+1]], fill=(210, 160, 135, int(alpha * 0.6)), width=int(scale * 2.5))

        for i in range(len(right_ing) - 1):
            alpha = int(255 * (1.0 - i / len(right_ing)))
            draw_line.line([right_ing[i], right_ing[i+1]], fill=(48, 24, 12, alpha), width=int(scale * 1.3))
            draw_shadow.line([right_ing[i], right_ing[i+1]], fill=(210, 160, 135, int(alpha * 0.6)), width=int(scale * 2.5))

    # Blur the shadow slightly for soft skin shading
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(scale * 0.8))

    # Composite layers
    crop_hi = Image.alpha_composite(crop_hi, shadow_layer)
    crop_hi = Image.alpha_composite(crop_hi, line_layer)

    # Downsample back to 1x
    crop_final = crop_hi.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS).convert('RGB')

    # Paste back into full image
    final_img = base_img.copy()
    final_img.paste(crop_final, (x0, y0))

    return final_img

# Generate variation A (fade inguinal, apex at 490)
img_a = make_plain_groin(fade_inguinal=True, crotch_apex_y=490)
img_a.save('scratch/test_plain_male_a.jpg', quality=95)
img_a.crop((250, 440, 350, 540)).save('scratch/test_crop_a.png')

# Generate variation B (apex slightly higher at 488)
img_b = make_plain_groin(fade_inguinal=True, crotch_apex_y=488)
img_b.save('scratch/test_plain_male_b.jpg', quality=95)
img_b.crop((250, 440, 350, 540)).save('scratch/test_crop_b.png')

print("Generated variations A and B")
