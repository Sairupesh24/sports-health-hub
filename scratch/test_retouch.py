from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load original male image
orig = Image.open('public/body_male_front.jpg')
w, h = orig.size

# We will work on a high-res or directly on the image array
arr = np.array(orig)

# Let's inspect the exact lines around the groin
# In crop coordinates (x: 250..350, y: 440..540):
# Center is x=300 (x_crop=50)

# Let's create a test copy
test_img = orig.copy()
draw = ImageDraw.Draw(test_img)

# Let's see what a smooth retouch looks like
