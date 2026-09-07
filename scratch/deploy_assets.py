import shutil
from PIL import Image

# 1. Back up original files if backup doesn't exist
try:
    shutil.copyfile('public/body_male_front.jpg', 'public/body_male_front_original_backup.jpg')
    print("Backed up public/body_male_front.jpg")
except Exception as e:
    print("Backup front error:", e)

try:
    shutil.copyfile('public/body_male_anatomy.jpg', 'public/body_male_anatomy_original_backup.jpg')
    print("Backed up public/body_male_anatomy.jpg")
except Exception as e:
    print("Backup anatomy error:", e)

# 2. Deploy perfection_male.jpg to public/body_male_front.jpg
new_front = Image.open('scratch/perfection_male.jpg')
new_front.save('public/body_male_front.jpg', quality=95)
print("Saved public/body_male_front.jpg (size:", new_front.size, ")")

# 3. Update public/body_male_anatomy.jpg (1200x896)
try:
    anatomy = Image.open('public/body_male_anatomy_original_backup.jpg').convert('RGB')
    anatomy.paste(new_front, (0, 0))
    anatomy.save('public/body_male_anatomy.jpg', quality=95)
    print("Updated public/body_male_anatomy.jpg (size:", anatomy.size, ")")
except Exception as e:
    print("Anatomy update error:", e)
