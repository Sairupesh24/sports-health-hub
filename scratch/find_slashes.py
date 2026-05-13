import os

src_dir = 'd:/Sports_Physio_Software/sports-health-hub-main/src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'rb') as f:
                content = f.read()
                if b'\\"' in content:
                    print(f"Found in {path}")
