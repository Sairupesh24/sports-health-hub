@echo off
echo --- Cleaning old build ---
rmdir /s /q dist

echo --- Building Project ---
call npm run build

echo --- Uploading to Oracle Cloud ---
scp -r -i "D:\Personal\VM Keys\ssh-key-2026-05-01.key" "dist" ubuntu@140.245.206.123:/home/ubuntu/

echo --- Deployment Complete! ---
pause