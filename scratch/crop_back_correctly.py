from PIL import Image
import os

def crop_back_correctly():
    img_path = "public/anatomy_heatmap_bg_grayscale.png"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return
        
    print(f"Opening: {img_path}")
    img = Image.open(img_path)
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # Left half: 0 to 512 (front)
    front_img = img.crop((0, 0, 512, height))
    front_path = "public/anatomy_heatmap_front.png"
    front_img.save(front_path)
    print(f"Saved front: {front_path} with size {front_img.size}")
    
    # Right half: 491 to 1003 (back) - centered for 763 path center
    back_img = img.crop((491, 0, 1003, height))
    back_path = "public/anatomy_heatmap_back.png"
    back_img.save(back_path)
    print(f"Saved back: {back_path} with size {back_img.size}")

if __name__ == "__main__":
    crop_back_correctly()
