# API Routes

API 端點文件。所有端點位於 `/api/` 路徑下。依目前路由樹更新（2026-11-03）；請求／回應的完整契約仍待逐功能驗證。

認證方式：

- **Cookie session**：NextAuth 標準 cookie（瀏覽器）
- **特殊驗證**：Stripe webhook、排程與 check-in 使用各自的驗證邏輯，請查看對應 handler。
- 目前路由樹沒有 `/api/auth/token`，因此不再將舊版 Bearer 流程列為通用認證方式。

權限依部門與職位授權，規則見 [src/lib/access/rules.ts](../src/lib/access/rules.ts)。舊版數字角色等級已不適合作為通用權限說明；下表以權限名稱或需查閱的 handler 為準。

---

## 公開端點（無需登入）

| Method | Path | Description | Query Params |
|--------|------|-------------|--------------|
| GET | `/api/achievements` | 列出所有成果 | `year?` — 年份篩選 |
| GET | `/api/alumni` | 列出公開校友記錄 | `year?` — 畢業年份篩選 |
| GET | `/api/events` | 列出已發布活動 | `upcoming=true` — 最近 24 小時內開始或尚未結束的活動；`limit=N` — 限制筆數 |
| GET | `/api/events/[id]` | 取得單一活動詳情（已發布）；若已登入一併回傳報名狀態 | — |
| GET | `/api/members` | 列出公開幹部（依網站展示設定） | — |
| GET | `/api/site-config` | 取得所有網站全域設定（key-value 物件） | — |
| GET | `/api/site-config/team-contacts` | 取得幹部聯絡資訊陣列（公開） | — |
| GET | `/api/sponsors` | 列出所有贊助商（含歷年贊助記錄） | `year?` — 篩選有該年度贊助的贊助商 |
| GET | `/api/auth/post-login` | 登入後導向 /portal；未登入導向 /login | — |
| POST | `/api/contact` | 聯絡表單送出 | — |

---

## Portal 端點（需登入）

使用 cookie session；部分操作另有權限檢查。

| Method | Path | Description | 權限／驗證 |
|--------|------|-------------|-----------|
| GET | `/api/announcements` | 列出已發布公告（含當前使用者已讀狀態） | 需登入 |
| GET | `/api/announcements/[id]` | 取得單一公告詳情 | 需登入 |
| POST | `/api/announcements/[id]/read` | 標記公告為已讀 | 需登入 |
| GET | `/api/user/profile` | 取得當前使用者個人資料 | 需登入 |
| PATCH | `/api/user/profile` | 更新個人資料（name, image） | `profile.public`（另有帳號保護檢查） |
| POST | `/api/events/[id]/register` | 報名活動（含容量檢查） | 需登入 |
| DELETE | `/api/events/[id]/register` | 取消報名 | 需登入 |
| POST | `/api/upload` | 個人照片上傳目前停用，回傳 404 | 停用時不進入登入檢查 |

### Portal 版端點

| Method | Path | Description | 權限／驗證 |
|--------|------|-------------|-----------|
| GET | `/api/portal/profile` | 取得當前使用者個人資料 | 需登入 |
| PATCH | `/api/portal/profile` | 更新個人資料 | `profile.public`（另有帳號保護檢查） |
| POST | `/api/portal/announcements/[id]/read` | 標記公告為已讀 | 需登入 |
| GET | `/api/portal/announcements` | 列出所有已發布公告 | 需登入 |
| GET | `/api/portal/announcements/[id]` | 取得公告詳情（含已讀狀態） | 需登入 |
| POST | `/api/portal/push/subscribe` | 儲存 Web Push 訂閱 | 需登入 |
| DELETE | `/api/portal/push/unsubscribe` | 刪除 Web Push 訂閱 | 需登入 |

---

## Exec 端點（依操作權限）

| Method | Path | Description | 權限／驗證 |
|--------|------|-------------|-----------|
| POST | `/api/announcements` | 建立公告 | `announcements.manage` |
| PUT | `/api/announcements/[id]` | 更新公告 | `announcements.manage` |
| DELETE | `/api/announcements/[id]` | 刪除公告 | `announcements.manage` |
| PATCH | `/api/announcements/[id]/publish` | 發布 / 取消發布公告 | `announcements.manage` |
| POST | `/api/sponsors` | 新增贊助商 | `content.manage` |
| GET | `/api/sponsors/[id]` | 取得單一贊助商（後台，含歷史記錄） | `content.manage` |
| PATCH | `/api/sponsors/[id]` | 更新贊助商 | `content.manage` |
| DELETE | `/api/sponsors/[id]` | 刪除贊助商 | `content.manage` |
| GET | `/api/sponsors/[id]/history` | 列出贊助年度記錄 | `content.manage` |
| POST | `/api/sponsors/[id]/history` | 新增贊助年度記錄 | `content.manage` |
| DELETE | `/api/sponsors/[id]/history/[historyId]` | 刪除贊助年度記錄 | `content.manage` |

---

## Admin 端點（依操作權限）

| Method | Path | Description | 權限／驗證 |
|--------|------|-------------|-----------|
| GET | `/api/admin/achievements` | 列出所有成果（後台） | `showcase.manage` |
| POST | `/api/admin/achievements` | 建立新成果 | `showcase.manage` |
| PATCH | `/api/admin/achievements/[id]` | 更新成果 | `showcase.manage` |
| DELETE | `/api/admin/achievements/[id]` | 刪除成果 | `showcase.manage` |
| POST | `/api/admin/upload` | 上傳圖片至 Supabase Storage（後台用，活動封面等） | `uploads.create` |
| GET | `/api/admin/i18n` | 取得所有翻譯 key-value（後台 i18n 管理） | `content.manage` |
| PATCH | `/api/admin/i18n` | 更新翻譯內容 | `content.manage` |
| GET | `/api/admin/site-config` | 讀取單一設定值（?key=...） | 公開 |
| PATCH | `/api/admin/site-config` | 更新設定值 | `content.manage` |
| GET | `/api/admin/alumni` | 列出所有校友（含隱藏記錄） | `content.manage` |
| POST | `/api/admin/alumni` | 建立新校友記錄 | `content.manage` |
| PATCH | `/api/admin/alumni/[id]` | 更新校友資料 | `content.manage` |
| DELETE | `/api/admin/alumni/[id]` | 刪除校友記錄 | `content.manage` |
| GET | `/api/admin/feature-flags` | 列出所有功能開關 | `content.manage` |
| PATCH | `/api/admin/feature-flags/[key]` | 更新功能開關狀態 | `content.manage` |
| GET | `/api/admin/email-templates` | 列出所有 Email 模板 | `content.manage` |
| PATCH | `/api/admin/email-templates/[key]` | 更新 Email 模板 | `content.manage` |

---

## 特殊端點

| Method | Path | Description | 驗證 |
|--------|------|-------------|------|
| GET, POST | `/api/auth/[...nextauth]` | NextAuth v5 handler（Google／Email Magic Link） | 內部 |

---

## 認證流程

### 瀏覽器（NextAuth 標準流程）

1. 使用者點擊登入 → 導向 `/api/auth/signin`
2. Google OAuth callback → session cookie 自動設定
3. 後續請求自動帶 cookie

### 行動 App（歷史說明）

舊版 `/api/auth/token` 不在目前程式碼中。行動 App 的相容性與外部呼叫者仍待確認，不能沿用原先的 token 交換與 30 天效期說明。

---

## 補充端點（目前路由樹）

以下補齊原文件未列出的操作，保留既有章節與有效描述。權限可能由共用服務或 handler 內的特殊驗證執行；沒有列出權限名稱不表示公開。詳細輸入、輸出與錯誤狀態請查看原始碼。

| Method | Path | 功能分類 | 權限／驗證 | Handler |
|--------|------|----------|-----------|---------|
| GET | `/api/admin/achievements/[id]` | 依路由功能 | `showcase.manage` | [原始碼](../src/app/api/admin/achievements/[id]/route.ts) |
| PUT | `/api/club/events/[id]/memories` | 社團管理 | `memories.manage` | [原始碼](../src/app/api/club/events/[id]/memories/route.ts) |
| GET | `/api/club/members` | 社團管理 | `members.view` | [原始碼](../src/app/api/club/members/route.ts) |
| POST | `/api/club/members` | 社團管理 | `members.manage`（由共用服務檢查） | [原始碼](../src/app/api/club/members/route.ts) |
| GET | `/api/club/members/[id]` | 社團管理 | `members.view` | [原始碼](../src/app/api/club/members/[id]/route.ts) |
| POST | `/api/club/members/complimentary` | 社團管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/club/members/complimentary/route.ts) |
| POST | `/api/club/members/import` | 社團管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/club/members/import/route.ts) |
| GET | `/api/club/reports` | 社團管理 | `reports.view` | [原始碼](../src/app/api/club/reports/route.ts) |
| GET | `/api/club/team-page` | 社團管理 | `showcase.manage` | [原始碼](../src/app/api/club/team-page/route.ts) |
| PUT | `/api/club/team-page` | 社團管理 | `showcase.manage` | [原始碼](../src/app/api/club/team-page/route.ts) |
| GET | `/api/cron/budget-sync` | 排程 | `Authorization: Bearer ${CRON_SECRET}` | [原始碼](../src/app/api/cron/budget-sync/route.ts) |
| POST | `/api/event/check-in` | 舊版活動／票務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/event/check-in/route.ts) |
| POST | `/api/event/checkout` | 舊版活動／票務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/event/checkout/route.ts) |
| POST | `/api/event/fall-2026/verify-member` | 舊版活動／票務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/event/fall-2026/verify-member/route.ts) |
| POST | `/api/event/member-verify` | 舊版活動／票務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/event/member-verify/route.ts) |
| GET | `/api/event/ticket/[token]` | 舊版活動／票務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/event/ticket/[token]/route.ts) |
| POST | `/api/events/[id]/orders` | 活動／訂單 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/events/[id]/orders/route.ts) |
| GET | `/api/finance/events/[id]` | 財務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/finance/events/[id]/route.ts) |
| POST | `/api/finance/events/[id]/sheet` | 財務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/finance/events/[id]/sheet/route.ts) |
| POST | `/api/finance/events/[id]/sheet/sync` | 財務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/finance/events/[id]/sheet/sync/route.ts) |
| GET | `/api/finance/summary` | 財務 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/finance/summary/route.ts) |
| GET | `/api/manage/events` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/route.ts) |
| POST | `/api/manage/events` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/route.ts) |
| GET | `/api/manage/events/[id]` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/route.ts) |
| PATCH | `/api/manage/events/[id]` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/route.ts) |
| DELETE | `/api/manage/events/[id]` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/route.ts) |
| GET | `/api/manage/events/[id]/dashboard` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/dashboard/route.ts) |
| POST | `/api/manage/events/[id]/publish` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/publish/route.ts) |
| POST | `/api/manage/events/[id]/ticket-types` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/ticket-types/route.ts) |
| PATCH | `/api/manage/events/[id]/ticket-types/[typeId]` | 活動管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/manage/events/[id]/ticket-types/[typeId]/route.ts) |
| GET | `/api/me/membership` | 個人資料／會員／票券 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/me/membership/route.ts) |
| POST | `/api/me/membership/checkout` | 個人資料／會員／票券 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/me/membership/checkout/route.ts) |
| GET | `/api/me/profile` | 個人資料／會員／票券 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/me/profile/route.ts) |
| PUT | `/api/me/profile` | 個人資料／會員／票券 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/me/profile/route.ts) |
| GET | `/api/me/tickets` | 個人資料／會員／票券 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/me/tickets/route.ts) |
| GET | `/api/orders/[id]` | 訂單 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/orders/[id]/route.ts) |
| GET | `/api/public/events/[id]` | 公開活動 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/public/events/[id]/route.ts) |
| GET | `/api/staff/check-in/verify` | 工作人員 check-in | 依 handler／共用服務檢查 | [原始碼](../src/app/api/staff/check-in/verify/route.ts) |
| POST | `/api/staff/check-in/verify` | 工作人員 check-in | 依 handler／共用服務檢查 | [原始碼](../src/app/api/staff/check-in/verify/route.ts) |
| POST | `/api/stripe/webhook` | 付款 webhook | 依 handler／共用服務檢查 | [原始碼](../src/app/api/stripe/webhook/route.ts) |
| GET | `/api/team` | 團隊管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/team/route.ts) |
| POST | `/api/team/groups` | 團隊管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/team/groups/route.ts) |
| POST | `/api/team/groups/[id]/archive` | 團隊管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/team/groups/[id]/archive/route.ts) |
| POST | `/api/team/members` | 團隊管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/team/members/route.ts) |
| DELETE | `/api/team/members/[id]` | 團隊管理 | 依 handler／共用服務檢查 | [原始碼](../src/app/api/team/members/[id]/route.ts) |
