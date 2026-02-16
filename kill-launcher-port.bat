@echo off
title Kill Port 5173
echo Checking port 5173...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo Killing process %%a on port 5173
    taskkill /F /PID %%a
)

echo Done.
pause
