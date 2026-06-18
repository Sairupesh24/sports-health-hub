from PIL import Image, ImageEnhance

def process_anatomy_image():
    input_path = "public/anatomy_heatmap_bg.png"
    output_path = "public/anatomy_heatmap_bg_grayscale.png"
    
    print(f"Opening image: {input_path}")
    img = Image.open(input_path)
    print(f"Image mode: {img.mode}, Size: {img.size}")
    
    # Check if image has alpha channel
    has_alpha = 'A' in img.mode
    
    if has_alpha:
        # Separate alpha channel
        r, g, b, a = img.split()
        rgb_img = Image.merge('RGB', (r, g, b))
        
        # Convert RGB to grayscale
        gray_rgb = rgb_img.convert('L')
        
        # Merge grayscale back with original alpha
        gray_img = Image.merge('RGBA', (gray_rgb, gray_rgb, gray_rgb, a))
    else:
        gray_img = img.convert('L')
    
    # We can also increase brightness and reduce contrast slightly to make it more "subtle"
    # so that it functions as a simple background.
    # Let's try making it 1.2x brighter and 0.8x contrast.
    # We'll save both a plain grayscale and a brightened one, or just do a subtle enhancement.
    
    # Let's do basic grayscale first, and we can adjust opacity in CSS, or we can adjust it here.
    # Let's also adjust the brightness of the grayscale part to make it lighter/softer:
    if has_alpha:
        # Separate again to enhance the RGB part
        r, g, b, a = gray_img.split()
        rgb_part = Image.merge('RGB', (r, g, b))
        
        # Make it lighter (brightness 1.3) and reduce contrast (0.7) to make it a softer blueprint
        enhancer_b = ImageEnhance.Brightness(rgb_part)
        rgb_part = enhancer_b.enhance(1.2)
        
        enhancer_c = ImageEnhance.Contrast(rgb_part)
        rgb_part = enhancer_c.enhance(0.8)
        
        # Merge back
        r_new, g_new, b_new = rgb_part.split()
        processed_img = Image.merge('RGBA', (r_new, g_new, b_new, a))
    else:
        enhancer_b = ImageEnhance.Brightness(gray_img)
        gray_img = enhancer_b.enhance(1.2)
        enhancer_c = ImageEnhance.Contrast(gray_img)
        processed_img = enhancer_c.enhance(0.8)
        
    processed_img.save(output_path, "PNG")
    print(f"Saved processed image to: {output_path}")

if __name__ == "__main__":
    process_anatomy_image()
