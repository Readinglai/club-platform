@echo off
chcp 65001 >nul
echo Committing backend API fixes...
cd /d "%~dp0"

git add "src/app/api/admin/announcements/route.ts"
git add "src/app/api/admin/announcements/[id]/route.ts"
git add "src/app/api/admin/announcements/[id]/publish/route.ts"
git add "src/app/api/sponsors/[id]/route.ts"
git add "src/app/api/sponsors/[id]/history/route.ts"
git add "src/app/api/sponsors/[id]/history/[historyId]/route.ts"

git commit -m "fix: add /api/admin/announcements endpoints + migrate sponsors to requireAuthJson

- Add GET/POST /api/admin/announcements (Bearer token auth, EXEC+)
- Add PUT/DELETE /api/admin/announcements/[id]
- Add PATCH /api/admin/announcements/[id]/publish (toggle published status)
- Migrate /api/sponsors/[id] PATCH/DELETE from cookie auth to requireAuthJson
- Migrate /api/sponsors/[id]/history GET/POST to requireAuthJson
- Migrate /api/sponsors/[id]/history/[historyId] DELETE to requireAuthJson

Fixes: Admin Announcements page 401 error in mobile app"

git push origin main
echo.
pause
