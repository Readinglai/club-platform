@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Pulling latest changes first...
git pull origin main --rebase
echo.
echo Pushing to origin main...
git push origin main
echo.
pause
