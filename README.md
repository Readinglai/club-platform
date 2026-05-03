# ROCSAUT Club Platform

UofT 校園社團管理平台。為 ROCSAUT（Event / Marketing / Operation 三部門）設計，架構可複製給其他社團使用。

## 技術棧

- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **ORM**: Prisma 7
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth v5 beta (Google OAuth + JWT Bearer)
- **Email**: Resend
- **Deployment**: Vercel

## 功能模組

| 模組 | 說明 |
|------|------|
| 首頁 | Hero / About / Upcoming Events / Sponsors / Footer |
| 後台 (Admin) | 成員管理、活動、公告、財務、部門、任務群組、校友、贊助商、報表、Site Config |
| Portal | 社員公告、任務追蹤、個人資料 |
| 活動系統 | 報名、容量管理、出席標記 |
| 財務系統 | 收支紀錄、月度預算、CSV 匯出 |
| Push 通知 | Web Push (VAPID) |

## 配套 App

React Native + Expo iOS App 位於 [flyincloud2001/club-platform-app](https://github.com/flyincloud2001/club-platform-app)。

App 透過本專案的 REST API 運作，認證使用 JWT Bearer token（`POST /api/auth/token`）。

## 本地開發

```bash
npm install
npx prisma generate
npm run dev
```

需要 `.env.local`，包含 `DATABASE_URL`、`NEXTAUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`RESEND_API_KEY`、`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`CRON_SECRET`。

開發時若需要讓 Expo Go（React Native App）繞過 Google OAuth，可在 Vercel 設定 `ALLOW_DEV_BYPASS=true`。此環境變數允許 `POST /api/auth/token` 以 `{ devBypass: true, email }` 直接簽發 JWT，**不應在正式 production 以外使用**。

## 部署

Vercel + Supabase。

- 正式站：[rocsaut-club-platform.vercel.app](https://rocsaut-club-platform.vercel.app)
- Supabase 連線必須使用 connection pooler（port 6543）

## API 文件

見 [API_ROUTES.md](./API_ROUTES.md)。
