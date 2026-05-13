with open('d:/Sports_Physio_Software/sports-health-hub-main/src/pages/ams/ExerciseLibrary.tsx', 'rb') as f:
    content = f.read()
    if b'\\' in content:
        print("Backslash found!")
        # Find the context
        idx = content.find(b'destructive\\"')
        if idx != -1:
            print(f"Found at {idx}: {content[idx:idx+20]}")
    else:
        print("No backslash found in binary mode.")
