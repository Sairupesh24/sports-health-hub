import os

def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    # Replace backslash-quote with quote just in case
    content = content.replace(b'\\"', b'"')
    with open(path, 'wb') as f:
        f.write(content)

src_dir = 'd:/Sports_Physio_Software/sports-health-hub-main/src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            fix_file(os.path.join(root, file))
