@echo off
chcp 65001 >nul
echo Committing TypeScript params fix for Next.js 15...
cd /d "%~dp0"

git add "src/app/api/admin/announcements/[id]/route.ts"
git add "src/app/api/admin/announcements/[id]/publish/route.ts"

git commit -m "fix: use Promise<{id}> for dynamic params in admin/announcements routes (Next.js 15)

Next.js 15 requires dynamic route params to be typed as Promise<{id: string}>
and awaited before use. Fixed [id]/route.ts and [id]/publish/route.ts."

git pull origin main --rebase
git push origin main
echo.
pause
