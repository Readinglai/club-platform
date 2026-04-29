# REMAINING WORK — ROCSAUT Club Platform
# 未完成項目總覽（2026-04-29）
# 本文件整合並取代 PLATFORM_DECISIONS.md、TODO.md、ARCHITECTURE.md

---

## 工作流程原則

- Claude 負責規劃架構、分析需求、生成 Claude Code 和 Claude Cowork 的指令
- Claude Code 負責所有程式碼生成、API、DB、邏輯修改
- Claude Cowork 負責瀏覽器測試、前端驗證、協調閉環
- 所有業務邏輯必須放在 API Routes，不得散落在 Server Components
- 所有新功能必須同步建立對應的 REST API endpoint，確保未來 iPhone App 可直接呼叫
- 認證同時支援 Cookie Session（網頁版）和 JWT Bearer Token（App 版）
- 給 Claude Code 的指令必須包含完整驗證步驟，並要求自主迭代直到 production 確認可用

---

## 平台基本資料

技術棧：Next.js 16、React 19、Tailwind 4、TypeScript、Prisma 7、Supabase、NextAuth v5 beta
本地路徑：C:\Users\flyin\OneDrive\桌面\開源代碼\社團平台
Vercel：rocsaut-club-platform.vercel.app
GitHub：flyincloud2001/club-platform
Super Admin 帳號：flyincloud2001@gmail.com（滕雲飛），唯一指定帳號，擁有所有權限

---

## 一、權限架構（四種角色）

### 1. Super Admin（超級管理員）
- 唯一指定帳號：flyincloud2001@gmail.com（滕雲飛）
- 擁有平台所有權限，無任何限制

### 2. Admin（管理員）
- 來源：未來社團內部 IT 團隊，從 Event、Marketing、Operation 三部門中選出，人數不超過三人
- 擁有後台所有功能的完整權限
- 人選由社團內部決定，平台只需正確實作此權限等級

### 3. Exec（執委）
- 來源：President + Vice President Event + Vice President Operation + Vice President Marketing（共四人）
- 擁有後台的部分功能：活動管理、公告管理、贊助商管理、財務管理、任務小組、商店管理
- 不可存取：部門總覽、成員管理、過往成果、數據報表、網站設定

### 4. Member（一般社員）
- 無後台存取權限
- 只擁有社員介面

---

## 二、後台左側菜單（最終順序）

| 順序 | 菜單項目 | Super Admin | Admin | Exec |
|------|----------|-------------|-------|------|
| 1 | 部門總覽 | ✅ | ✅ | ❌ |
| 2 | 成員管理 | ✅ | ✅ | ❌ |
| 3 | 活動管理 | ✅ | ✅ | ✅ |
| 4 | 公告管理 | ✅ | ✅ | ✅ |
| 5 | 任務小組 | ✅ | ✅ | ✅ |
| 6 | 過往成果 | ✅ | ✅ | ❌ |
| 7 | 贊助商管理 | ✅ | ✅ | ✅ |
| 8 | 財務管理 | ✅ | ✅ | ✅ |
| 9 | 商店管理（待新增） | ✅ | ✅ | ✅ |
| 10 | 數據報表 | ✅ | ✅ | ❌ |
| 11 | 網站設定 | ✅ | ✅ | ❌ |

---

## 三、社員介面（Member Interface）

### 適用對象
所有登入用戶皆有此介面，包含 Super Admin、Admin、Exec、Member。
Super Admin、Admin、Exec 額外擁有後台存取權限。
Member 只有此介面。

### 功能一：查看公告
- 公告來源：後台公告管理所發布的公告
- 每當新公告發布，所有社員的手機 App 會收到推播通知
- 社員可在 App 內查看公告全文

### 功能二：任務接收與狀態更新
- 當後台任務小組建立一個包含該社員的任務時，該社員的 App 會收到任務推播通知
- 任務狀態流程（社員手動操作觸發）：
  1. 待辦（初始狀態，任務建立時）
  2. 進行中（社員按下「接收任務」後更新）
  3. 已完成（社員按下「任務完成」後更新）
- 狀態更新同步反映在社員 App 和後台任務小組頁面

### 功能三：社員聊天室
- 未來結合 MapleWhisper 專案
- 細節見第九節

### 功能四：商店瀏覽與購物
- 瀏覽已發布商品
- 透過 Stripe 付款
- 查看自己的訂單

---

## 四、iPhone App 架構

### 介面分層
- Super Admin、Admin、Exec：擁有「管理介面」+「社員介面」兩個介面
- Member：只擁有「社員介面」

### 管理介面（App 版）
- Super Admin、Admin：可操作後台所有功能
- Exec：只可操作活動管理、公告管理、贊助商管理、財務管理、任務小組

### 社員介面（App 版）
- 查看公告（含推播通知）
- 任務接收與狀態更新（含推播通知）
- 社員聊天室（MapleWhisper 整合）
- 商店瀏覽與購物

### 技術原則
- 所有業務邏輯必須放在 API Routes，不得散落在 Server Components
- 所有功能必須同步建立對應的 REST API endpoint，App 直接呼叫同一組後端
- 認證支援 Cookie Session（網頁版）和 JWT Bearer Token（App 版）並存

### 開發環境
- 推薦技術：React Native（與現有 React 技術棧一致）
- 開發平台：Windows 筆電完成所有開發
- 最終編譯和上架：需要 Mac（可借用或租用雲端 Mac 服務）
- 需要 Apple Developer 帳號（年費 $99 美金）
- 詳細規劃另行生成獨立文件

---

## 五、未完成的 Architecture 項目

### Foundation

#### 0.3 資料庫層
- 0.3.3 Seed 資料（目前以手動 SQL 替代，正式 seed 腳本尚未建立）

### Module 4：管理後台

#### 4.3 內容管理
- 4.3.1 首頁各 section 內容編輯介面 
- 4.3.2 圖片上傳與管理 API `Claude Code`（見第六節詳細規劃）

### Module 8：周邊商店（改為自建，不使用 Shopify）
- 見第七節詳細規劃

### Module 9：多租戶擴展（長期，商業化後再做）
- 9.1.1 多租戶資料隔離 `Claude Code`
- 9.1.2 社團 onboarding 流程 API `Claude Code`
- 9.1.3 社團 onboarding UI
- 9.1.4 超級管理員介面
- 9.2.1 跨社團活動 API `Claude Code`
- 9.2.2 跨社團活動 UI
- 9.2.3 校園公告系統 API `Claude Code`
- 9.2.4 校園公告系統 UI

---

## 六、圖片上傳系統（新增）

### 診斷結論（2026-04-29）

**Supabase Storage Bucket 狀態：**
Storage 在設定層有定義，但 Supabase 上完全沒有建立任何 bucket。
- config.yaml（infrastructure.storage，第 76-78 行）宣告 provider 為 supabase，URL 為環境變數 ${STORAGE_URL}
- .env.example 第 12 行有 STORAGE_URL=（空值，尚未填入）
- 直接查詢 Supabase 專案的 storage.buckets 表 → 回傳空陣列
- 整個 codebase 中沒有任何地方 import 或呼叫 @supabase/supabase-js 的 storage client

**Prisma 中含圖片 URL 的欄位：**

| Model | 欄位 | 行號 | 目前輸入方式 |
|-------|------|------|------------|
| User | image | schema:74 | 來自 Google OAuth，不可手動編輯 |
| Sponsor | logoUrl String? | schema:377 | 手動輸入 URL 文字框 |
| Achievement | imageUrl String? | schema:400 | 手動輸入 URL 文字框 |
| Alumni | photoUrl String? | schema:425 | 手動輸入 URL 文字框 |
| SiteConfig | key="heroImageUrl"（value 欄） | — | 手動輸入 URL 文字框 |

**現有圖片上傳功能：完全沒有。**
- 無任何 /api/upload route
- 無任何 `<input type="file">` 或 FormData 用於檔案上傳
- 無任何上傳相關 component
- 所有圖片欄位一律是 placeholder="https://..." 的純文字輸入框，貼 URL 後有小圖預覽

**需要加入圖片上傳功能的後台頁面清單：**

| 頁面路徑 | 元件檔案 | 欄位 |
|---------|---------|------|
| admin/sponsors/[id] | SponsorEditForm.tsx | logoUrl |
| admin/sponsors（SponsorsTable 內嵌編輯） | SponsorsTable.tsx | logoUrl |
| admin/achievements（新增表單） | AchievementsManager.tsx | imageUrl |
| admin/achievements/[id]（編輯表單） | AchievementEditForm.tsx | imageUrl |
| admin/alumni | AlumniManager.tsx | photoUrl |
| admin/site-config | SiteConfigForm.tsx | heroImageUrl |

合計 6 個入口點，涉及 4 個 Prisma model + 1 個 SiteConfig key-value。

### 實作需要做的事
1. 在 Supabase 建立 Storage bucket（例如 images）
2. 建立 /api/upload API route，負責產生 signed upload URL 或接收 multipart
3. 將上述 6 個文字框替換為檔案上傳元件
4. User 的頭貼欄位來自 Google OAuth，目前不可手動編輯，此限制維持

---

## 七、視覺主題系統（新增，簡短規劃）

### 診斷結論（2026-04-29）
- 目前前端 91 個檔案、156 個出現點的顏色全部硬編碼為常數字串
- config.yaml 的 theme 值和前端完全無連線，只是巧合對齊
- globals.css 的 CSS 變數和 config.yaml 完全無對應
- 未來計畫建立獨立的視覺編輯器系統，整合進本平台

### 需要做的事（方案 B：存進 DB，無需重新部署）
1. 在 SiteConfig 新增 theme key（JSON 格式），儲存 primary、secondary、background、text、font_sans
2. Root layout 從 DB 讀取 theme 設定，動態注入 CSS 變數到 `<style>` 標籤
3. 將 91 個檔案的硬編碼顏色字串全部替換為 CSS 變數
4. 新增 API endpoint：PATCH /api/admin/site-config/theme（ROLE_LEVEL >= 4）
5. 詳細規劃待視覺編輯器系統開發時再補充

---

## 八、輕量商店（新增，取代原 Shopify 方案）

### 決策
不使用 Shopify 或任何第三方電商平台，在平台內自建輕量商店，使用 Stripe 處理付款。
後台授權：商店管理由 Exec 以上（ROLE_LEVEL >= 3）可存取，Operation VP 主要負責管理。

### DB Schema 需新增

**Product：**
- id（String，cuid）
- name（String）
- description（String，可空）
- price（Decimal，單位 CAD）
- imageUrl（String，可空）
- stock（Int，-1 代表無限）
- isPublished（Boolean）
- createdAt、updatedAt

**Order：**
- id（String，cuid）
- userId（關聯 User）
- stripePaymentIntentId（String）
- status（enum：PENDING / PAID / SHIPPED / CANCELLED）
- totalAmount（Decimal）
- createdAt、updatedAt

**OrderItem：**
- id（String，cuid）
- orderId（關聯 Order）
- productId（關聯 Product）
- quantity（Int）
- unitPrice（Decimal）

### API Endpoints 需新增

公開端點：
- GET /api/products：回傳所有已發布商品列表
- GET /api/products/[id]：回傳商品詳情

社員端點（需登入，ROLE_LEVEL >= 2）：
- POST /api/portal/orders：建立訂單並取得 Stripe Payment Intent
- GET /api/portal/orders：查看自己的訂單列表
- GET /api/portal/orders/[id]：查看訂單詳情

管理端點（ROLE_LEVEL >= 3）：
- GET /api/admin/products：回傳所有商品（含未發布）
- POST /api/admin/products：新增商品
- PATCH /api/admin/products/[id]：編輯商品
- DELETE /api/admin/products/[id]：刪除商品
- GET /api/admin/orders：回傳所有訂單
- PATCH /api/admin/orders/[id]/status：更新訂單狀態

### 前台 UI
- /products 商品列表頁
- /products/[id] 商品詳情頁（含加入購物車、Stripe Checkout）

### 後台 UI
- /admin/products 商品管理頁面（新增、編輯、刪除、發布）
- /admin/orders 訂單管理頁面（查看、更新狀態）

### 環境變數
需新增 STRIPE_SECRET_KEY、STRIPE_PUBLISHABLE_KEY、STRIPE_WEBHOOK_SECRET。

### 注意事項
ROCSAUT 的法律身份（是否為正式非營利組織）需確認後才能開立 Stripe 帳號。

---

## 九、MapleWhisper 聊天室整合（新增）

### MapleWhisper 專案說明
MapleWhisper 是一個 Flask + Python 的匿名配對聊天系統，使用 MapleLink 作為認證後端。

**核心架構：**
- 採用 SSE（Server-Sent Events）實現即時訊息推送
- 配對系統：隨機配對兩個用戶進入聊天室，有 24 小時冷卻期防止重複配對
- 封鎖系統：用戶可封鎖對方，封鎖後不會再被配對（持久化至 SQLite）
- 舉報系統：用戶可舉報不當行為（持久化至 SQLite）
- 訊息儲存：純記憶體（in-memory），不持久化，最多保留 200 條訊息，每條最長 500 字
- 認證依賴：MapleLink（Flask + SQLAlchemy + PostgreSQL），提供 JWT Token 認證

**MapleLink 提供的 API：**
- POST /auth/register：註冊
- POST /auth/login：登入取得 JWT Token
- POST /auth/verify-token：驗證 JWT Token
- POST /auth/email-verification/start：開始 Email 驗證
- POST /auth/email-verification/confirm：確認 Email 驗證

### 整合策略
MapleWhisper 原本使用 MapleLink 的獨立認證系統，整合進 ROCSAUT 平台後需要調整：

**認證層整合：**
- 不使用 MapleLink 的認證，改用 ROCSAUT 的 JWT Bearer Token
- MapleWhisper 的聊天功能（配對、訊息、封鎖、舉報）核心邏輯保留，以 TypeScript 移植

**需要新增的 API Endpoints（整合至 Next.js）：**
- POST /api/portal/chat/match：開始配對
- DELETE /api/portal/chat/match：取消配對或結束聊天
- GET /api/portal/chat/match/status：查詢配對狀態
- GET /api/portal/chat/[matchId]/stream：SSE 訊息串流
- POST /api/portal/chat/[matchId]/message：發送訊息
- GET /api/portal/chat/[matchId]/history：取得訊息歷史
- POST /api/portal/chat/block：封鎖配對對象
- POST /api/portal/chat/report：舉報用戶

**重要技術限制：**
- Next.js Vercel serverless 環境不支援長連線 SSE，需要評估替代方案（Pusher、Ably 或 WebSocket 服務）
- 訊息持久化：原版不儲存訊息，整合後需決定是否要持久化至 DB
- 優先實作 App 版，網頁版為次要

**整合細節待另行規劃。**

---

## 十、執行優先順序建議

1. 圖片上傳系統
2. 視覺主題系統（基礎設施）
3. 輕量商店
4. MapleWhisper 整合（需先決定 SSE 替代方案）
5. iPhone App 開發（另行生成獨立文件）
6. Module 9 多租戶擴展（商業化後再做）

---

## 十一、重要設計決策備忘

### 永久禁止重新引入
- WAITLISTED 功能：已永久移除，報名滿額直接回傳錯誤，不得以任何形式重新引入

### 組長（Team Lead）角色
- 不是社團的永久身分，不應出現在全域成員管理的角色列表中
- 只是任務小組內部的臨時角色，當某成員在任務小組內被指派為組長時才有意義
- 當任務小組結束，組長身分自動消失

### 認證設計
- Google OAuth 與 utoronto.ca 不相容（UofT 使用 Microsoft/Outlook 基礎設施），因此認證改為邀請制
- flyincloud2001@gmail.com 為 SUPER_ADMIN 白名單例外
- Resend 寄件者暫用 onboarding@resend.dev，待 rocsaut.ca 網域驗證後切換

### 環境變數（需在 Vercel 手動設定）
- CRON_SECRET：保護 cron endpoint
- EMAIL_FROM：Resend 寄件地址
- VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY：推播通知
- STRIPE_SECRET_KEY、STRIPE_PUBLISHABLE_KEY、STRIPE_WEBHOOK_SECRET：商店付款（待新增）
- STORAGE_URL：Supabase Storage（待建立 bucket 後填入）

### Supabase 連線
- Vercel serverless 必須使用 port 6543（connection pooler），不可用 5432（direct connection）
- 密碼應避免特殊字元（& 和 @）

### Prisma
- Prisma client 需提交至 git（src/generated/prisma/）
- package.json 的 postinstall 需加入 `prisma generate`
