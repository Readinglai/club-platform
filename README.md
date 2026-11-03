# ROCSAUT Club Platform

UofT 校園社團管理平台。為 ROCSAUT（Event / Marketing / Operation 三部門）設計，架構可複製給其他社團使用。

## 技術棧

- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **ORM**: Prisma 7
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth v5 beta (Google OAuth + Email Magic Link，Cookie Session)
- **Email**: Gmail SMTP
- **Deployment**: Vercel

## 功能模組

| 模組 | 說明 |
|------|------|
| 首頁 | Hero / About / Upcoming Events / Sponsors / Footer |
| Portal 管理功能 | 成員管理、活動、公告、財務、團隊、校友、贊助商、報表、Site Config |
| Portal 社員功能 | 社員公告、會員資格、個人票券、個人資料 |
| 活動系統 | 活動管理、報名、Stripe 購票、QR Check-in |
| 財務系統 | 收支報表、活動預算、Google Sheets 同步 |
| Push 通知 | Web Push (VAPID) |

## 配套 App

React Native + Expo iOS App 位於 [flyincloud2001/club-platform-app](https://github.com/flyincloud2001/club-platform-app)。

此為配套 App 專案連結；目前網站路由樹沒有舊版 `POST /api/auth/token`，與 App 的認證相容性仍待驗證。

## 本地開發

```bash
npm install
npx prisma generate
npm run dev
```

先建立 `.env.local`，設定資料庫與所需整合的環境變數。設定名稱見 [.env.example](.env.example) 與 [環境設定清單](docs/baseline.md#environment-names-not-values)；`.env.example` 尚未涵蓋所有整合。

上述啟動指令假設資料庫結構已準備完成。全新資料庫初始化與既有測試資料的重建尚未驗證，請參閱現況文件中的已知缺口。

## 部署

Vercel + Supabase。

- 正式站：[rocsaut-club-platform.vercel.app](https://rocsaut-club-platform.vercel.app)
- Supabase 連線必須使用 connection pooler（port 6543）

## API 文件

見 [API_ROUTES.md](docs/API_ROUTES.md)。

## 開發檢查與維護文件

型別與程式碼風格檢查：

```bash
npm run typecheck
npm run lint
```

專案整理與重構以維持現有行為為原則，相關文件如下：

- [現況與重構基準](docs/baseline.md)：架構、環境設定差異與待驗證項目。
- [API 文件](docs/API_ROUTES.md)：現有端點、功能描述與驗證方式線索。
- [腳本清單](docs/script-inventory.md)：測試、初始化與維護腳本的用途及執行條件。

尚待驗證的環境設定與相容性事項記錄於現況與重構基準文件。需要資料庫的測試腳本依賴預先建立的測試資料，且會使用環境變數指定的資料庫；執行前請先確認腳本清單中的條件與資料異動。
