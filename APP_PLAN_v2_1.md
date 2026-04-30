# ROCSAUT iPhone App 開發規劃
# 版本：2.0（整合 REMAINING_WORK_v2.md 所有內容）
# 日期：2026-04-29

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
- 細節見第九節（MapleWhisper 整合）

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
- 推薦技術：React Native + Expo（與現有 React 技術棧一致）
- 開發平台：Windows 筆電完成所有開發
- 最終編譯和上架：需要 Mac（家中已有）
- 需要 Apple Developer 帳號（年費 $99 美金，待申請）
- Expo Go App 用於開發階段手機預覽，免 Xcode

---

## 五、App 技術棧決策

| 層級 | 技術 | 理由 |
|------|------|------|
| 框架 | React Native + Expo | 與現有 React 技術棧一致，Windows 可開發 |
| 語言 | TypeScript | 與後端一致 |
| 導航 | Expo Router | 基於檔案系統，接近 Next.js 習慣 |
| 狀態管理 | Zustand | 輕量，適合中小型 App |
| API 呼叫 | React Query + Axios | 快取、重試、loading 狀態管理 |
| 認證 | Google OAuth + JWT Bearer Token | 後端已實作 POST /api/auth/token |
| 推播通知 | Expo Notifications | 封裝 APNs（iOS） |
| 本地儲存 | Expo SecureStore | 儲存 JWT token |
| UI 元件 | NativeWind（Tailwind for RN） | 與現有 Tailwind 習慣一致 |

---

## 六、前置條件

| 項目 | 狀態 | 說明 |
|------|------|------|
| Apple Developer 帳號 | 未申請 | 需 $99/年，developer.apple.com |
| Mac 電腦（Xcode） | 有，待設定 | 最終編譯和上架用 |
| Expo Go App | 待安裝 | 開發階段在手機預覽，免 Xcode |
| VAPID Keys | 未設定 | Web Push 用，App 推播另走 APNs |

---

## 七、畫面清單

### 公開畫面
- Splash Screen（App 啟動畫面）
- Login（Google OAuth 登入）

### 社員介面（Tab Bar）
- Tab 1：首頁（公告列表 + 未讀數量徽章）
- Tab 2：任務（我的任務列表 + 狀態更新）
- Tab 3：活動（即將到來的活動列表）
- Tab 4：個人資料（編輯 bio、major、rocsautYear、instagram、linkedin、頭像）

### 社員介面（次頁）
- 公告詳情頁
- 任務詳情頁
- 活動詳情頁（含報名 / 取消報名）

### 管理介面（底部 Tab 或側邊選單，EXEC+）
- 活動管理列表 + 新增 / 編輯
- 公告管理列表 + 新增 / 編輯
- 任務小組列表 + 詳情（成員、任務看板、投票）
- 贊助商管理
- 財務記錄
- 成員列表（查看）

---

## 八、API 對應

所有功能直接呼叫現有後端 API，Header 帶 `Authorization: Bearer <JWT>`。

### 認證
| 功能 | API |
|------|-----|
| Google OAuth 登入 | POST /api/auth/token |
| 取得個人資料 | GET /api/portal/profile |
| 更新個人資料 | PATCH /api/portal/profile |
| 更新頭像 | PATCH /api/admin/members/[id]/avatar |

### 公告
| 功能 | API |
|------|-----|
| 列出公告 | GET /api/portal/announcements |
| 公告詳情 | GET /api/portal/announcements/[id] |
| 標記已讀 | POST /api/portal/announcements/[id]/read |

### 任務
| 功能 | API |
|------|-----|
| 我的任務列表 | GET /api/portal/tasks |
| 任務詳情 | GET /api/portal/tasks/[id] |
| 接受任務 | PATCH /api/portal/tasks/[id]/accept |
| 完成任務 | PATCH /api/portal/tasks/[id]/complete |

### 活動
| 功能 | API |
|------|-----|
| 活動列表 | GET /api/events?upcoming=true |
| 活動詳情 | GET /api/events/[id] |
| 報名活動 | POST /api/events/[id]/register |
| 取消報名 | DELETE /api/events/[id]/register |

### 推播訂閱
| 功能 | API |
|------|-----|
| 儲存推播訂閱 | POST /api/portal/push/subscribe |
| 刪除推播訂閱 | DELETE /api/portal/push/unsubscribe |

### 商店（待實作）
| 功能 | API |
|------|-----|
| 商品列表 | GET /api/products |
| 商品詳情 | GET /api/products/[id] |
| 建立訂單 | POST /api/portal/orders |
| 我的訂單 | GET /api/portal/orders |
| 訂單詳情 | GET /api/portal/orders/[id] |

### 管理（EXEC+）
| 功能 | API |
|------|-----|
| 活動管理 CRUD | /api/admin/events |
| 公告管理 CRUD | /api/announcements |
| 任務小組 CRUD | /api/exec/task-groups |
| 贊助商管理 | /api/sponsors |
| 財務記錄 | /api/admin/finance/records |
| 圖片上傳 | POST /api/admin/upload |

---

## 九、推播通知架構

iOS App 推播走 APNs（Apple Push Notification Service）。

流程：
1. App 啟動後向 APNs 申請推播權限
2. 取得 Expo Push Token
3. 呼叫 POST /api/portal/push/subscribe 儲存 token 到 PushSubscription 表
4. 後端觸發推播時（新公告、新任務指派）呼叫 Expo Push API 發送通知

注意：現有後端的 /api/cron/task-reminder 是 Web Push（VAPID），App 推播需另外實作 Expo Push API 呼叫。需在後端新增 Expo Push Token 的儲存欄位或擴充現有 PushSubscription model。

---

## 十、認證流程

1. App 使用 Expo AuthSession 發起 Google OAuth
2. 取得 authorization code
3. POST /api/auth/token 交換取得 JWT（有效期 30 天）
4. JWT 存入 Expo SecureStore
5. 後續所有 API 請求 Header 帶 `Authorization: Bearer <token>`
6. Token 到期時引導使用者重新登入

後端 POST /api/auth/token 實作細節：
- 接收 { code, redirectUri } body
- 向 https://oauth2.googleapis.com/token 用 code 換取 id_token
- Base64URL decode id_token payload 取出 email
- 查 DB 確認 user 存在，否則回傳 403
- 用 @auth/core/jwt 的 encode() 產生 NextAuth 相容 JWT（sub=user.id, role, email, name，有效期 30 天）
- 回傳 { token, expiresAt }

---

## 十一、專案結構規劃

```
rocsaut-app/
├── app/                    # Expo Router 頁面
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (member)/           # 社員 Tab Bar
│   │   ├── index.tsx       # 首頁（公告）
│   │   ├── tasks.tsx       # 任務
│   │   ├── events.tsx      # 活動
│   │   └── profile.tsx     # 個人資料
│   ├── (admin)/            # 管理介面
│   │   ├── index.tsx
│   │   ├── events/
│   │   ├── announcements/
│   │   └── task-groups/
│   └── _layout.tsx
├── components/             # 共用元件
│   ├── ui/                 # 基礎 UI 元件
│   ├── AnnouncementCard.tsx
│   ├── TaskCard.tsx
│   └── EventCard.tsx
├── lib/
│   ├── api.ts              # Axios instance + interceptors
│   ├── auth.ts             # JWT 管理
│   └── store.ts            # Zustand store
├── hooks/                  # React Query hooks
│   ├── useAnnouncements.ts
│   ├── useTasks.ts
│   └── useEvents.ts
└── constants/
    └── config.ts           # API base URL 等設定
```

---

## 十二、開發優先順序

### Phase 1：核心社員功能（最優先）
1. 認證（Google OAuth + JWT）
2. 公告列表 + 詳情 + 已讀標記
3. 任務列表 + 狀態更新
4. 個人資料編輯
5. 推播通知（新公告、新任務）

### Phase 2：活動功能
6. 活動列表 + 詳情
7. 活動報名 + 取消

### Phase 3：管理功能（EXEC+）
8. 公告管理 CRUD
9. 活動管理 CRUD
10. 任務小組管理

### Phase 4：商店功能
11. 商品列表 + 詳情
12. 購物車 + Stripe 付款
13. 訂單查看

### Phase 5：聊天室（MapleWhisper 整合）
14. 配對系統
15. 即時訊息（需先決定 SSE 替代方案）
16. 封鎖 + 舉報

### Phase 6：上架準備
17. Apple Developer 帳號申請
18. EAS Build 打包
19. App Store Connect 上架

---

## 十三、未完成的 Architecture 項目（來自 REMAINING_WORK_v2.md）

### Foundation

#### 0.3 資料庫層
- 0.3.3 Seed 資料（目前以手動 SQL 替代，正式 seed 腳本尚未建立）

### Module 4：管理後台

#### 4.3 內容管理
- 4.3.1 首頁各 section 內容編輯介面
- 4.3.2 圖片上傳與管理 API（已完成基礎建設，詳見第十四節）

### Module 8：周邊商店
- 見第十五節詳細規劃

### Module 9：多租戶擴展（長期，商業化後再做）
- 9.1.1 多租戶資料隔離
- 9.1.2 社團 onboarding 流程 API
- 9.1.3 社團 onboarding UI
- 9.1.4 超級管理員介面
- 9.2.1 跨社團活動 API
- 9.2.2 跨社團活動 UI
- 9.2.3 校園公告系統 API
- 9.2.4 校園公告系統 UI

---

## 十四、圖片上傳系統（現狀）

### 已完成（2026-04-29）
- Supabase Storage bucket（images，public）已建立
- POST /api/admin/upload 已實作（需 ROLE_LEVEL >= 3）
- 6 個後台入口點已替換為 ImageUpload 元件
- SUPABASE_ANON_KEY 已設定於 Vercel

### 入口點清單
| 頁面路徑 | 欄位 |
|---------|------|
| admin/sponsors/[id] | logoUrl |
| admin/sponsors（SponsorsTable） | newLogoUrl |
| admin/achievements | imageUrl |
| admin/achievements/[id] | imageUrl |
| admin/alumni | photoUrl |
| admin/site-config | heroImageUrl |
| admin/members/[id] | image（頭像） |
| admin/events/[id] | imageUrl（封面圖） |

### User 的頭貼欄位
來自 Google OAuth，後台可透過 PATCH /api/admin/members/[id]/avatar 覆蓋，此為刻意設計。

---

## 十五、視覺主題系統（待實作）

### 診斷結論（2026-04-29）
- 目前前端 91 個檔案、156 個出現點的顏色全部硬編碼為常數字串
- config.yaml 的 theme 值和前端完全無連線
- globals.css 的 CSS 變數和 config.yaml 完全無對應
- 未來計畫建立獨立的視覺編輯器系統，整合進本平台

### 需要做的事（方案 B：存進 DB，無需重新部署）
1. 在 SiteConfig 新增 theme key（JSON 格式），儲存 primary、secondary、background、text、font_sans
2. Root layout 從 DB 讀取 theme 設定，動態注入 CSS 變數到 `<style>` 標籤
3. 將 91 個檔案的硬編碼顏色字串全部替換為 CSS 變數
4. 新增 API endpoint：PATCH /api/admin/site-config/theme（ROLE_LEVEL >= 4）
5. 詳細規劃待視覺編輯器系統開發時再補充

---

## 十六、輕量商店（待實作）

### 決策
不使用 Shopify 或任何第三方電商平台，在平台內自建輕量商店，使用 Stripe 處理付款。
後台授權：商店管理由 Exec 以上（ROLE_LEVEL >= 3）可存取，Operation VP 主要負責管理。

注意：ROCSAUT 的法律身份（是否為正式非營利組織）需確認後才能開立 Stripe 帳號。

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

---

## 十七、MapleWhisper 聊天室整合（待實作）

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

整合細節待另行規劃。

---

## 十八、後端需新增的項目（為 App 補充）

1. PushSubscription model 需新增 `expoToken String?` 欄位（儲存 Expo Push Token）
2. 後端推播邏輯需同時支援 Web Push（VAPID）和 Expo Push API
3. 建立公告和任務指派時，觸發 Expo Push 通知

---

## 十九、重要設計決策備忘

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
- STORAGE_URL：Supabase Storage（已設定）
- SUPABASE_ANON_KEY：Supabase Storage 上傳（已設定）

### Supabase 連線
- Vercel serverless 必須使用 port 6543（connection pooler），不可用 5432（direct connection）
- 密碼應避免特殊字元（& 和 @）

### Prisma
- Prisma client 需提交至 git（src/generated/prisma/）
- package.json 的 postinstall 需加入 `prisma generate`

---

## 二十、整體執行優先順序

1. iPhone App Phase 1（核心社員功能）
2. iPhone App Phase 2（活動功能）
3. iPhone App Phase 3（管理功能）
4. iPhone App Phase 4（商店功能）
5. MapleWhisper 整合（需先決定 SSE 替代方案）
6. 視覺主題系統
7. iPhone App Phase 6（上架）
8. Module 9 多租戶擴展（商業化後再做）

---

## 二十一、時間估算

| Phase | 預估時間 |
|-------|---------|
| 開發環境設定 | 0.5 天 |
| Phase 1 核心社員功能 | 5~7 天 |
| Phase 2 活動功能 | 2~3 天 |
| Phase 3 管理功能 | 5~7 天 |
| Phase 4 商店功能 | 3~5 天 |
| Phase 5 聊天室 | 5~7 天 |
| Phase 6 上架準備 | 2~3 天 |
| **合計** | **約 23~33 天** |

---

*文件由 Claude 生成於 2026-04-29，整合 REMAINING_WORK_v2.md 所有內容*
