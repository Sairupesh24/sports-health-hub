import sys

path = 'd:/Sports_Physio_Software/sports-health-hub-main/src/pages/ams/ProgramsPage.tsx'
with open(path, 'rb') as f:
    lines = f.readlines()
    if len(lines) >= 95:
        line = lines[94] # 1-indexed line 95
        print(f"Line 79: {line}")
        print(f"Bytes: {list(line)}")
    else:
        print(f"File only has {len(lines)} lines")
