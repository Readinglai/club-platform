@echo off
cd /d "C:\Users\flyin\OneDrive\桌面\開源代碼\社團平台"
if exist ".git\index.lock" del /f ".git\index.lock"
git add -A
git commit -m "docs: cleanup redundant files and update README + API_ROUTES

- Remove test_upload.png, page_export.tsx, COWORK_CONTEXT.md,
  APP_PLAN_v2_1.md (wrong repo), mempalace.yaml
- Rewrite README.md with actual project description
- Add 9 missing routes to API_ROUTES.md:
  alumni, events (public list), members (public list),
  site-config/team-contacts, auth/post-login,
  upload, admin/upload, admin/members/[id]/avatar,
  admin/i18n"
git push origin master
echo Done.
pause
