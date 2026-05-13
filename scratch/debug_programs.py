path = 'd:/Sports_Physio_Software/sports-health-hub-main/src/pages/ams/ProgramsPage.tsx'
with open(path, 'rb') as f:
    lines = f.readlines()
    for i in range(min(len(lines), 80), min(len(lines), 110)):
        print(f"{i+1}: {lines[i]}")
