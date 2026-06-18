from PIL import Image
import numpy as np

def inspect(name, path):
    img = Image.open(path).convert('L')
    arr = np.array(img)
    # let's try threshold 240
    non_white = np.where(arr < 240)
    if len(non_white[0]) == 0:
        print(f"{name}: empty")
        return
    min_y, max_y = np.min(non_white[0]), np.max(non_white[0])
    min_x, max_x = np.min(non_white[1]), np.max(non_white[1])
    center_x = (min_x + max_x) / 2
    
    # Also calculate center of mass (weighted average of dark pixels)
    weights = 255.0 - arr
    weights[arr >= 240] = 0
    col_sums = np.sum(weights, axis=0)
    com_x = np.sum(np.arange(len(col_sums)) * col_sums) / np.sum(col_sums)
    
    print(f"{name} ({path}): size={img.size}, bbox=x({min_x}..{max_x}) y({min_y}..{max_y}), center_x={center_x:.1f}, com_x={com_x:.1f}")

inspect("Grayscale", "public/anatomy_heatmap_bg_grayscale.png")
inspect("Front", "public/anatomy_heatmap_front.png")
inspect("Back", "public/anatomy_heatmap_back.png")
