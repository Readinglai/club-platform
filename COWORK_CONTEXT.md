# ROCSAUT 社團平台 — Cowork 完整上下文
<!-- 此文件由 Claude Cowork 自動從 claude.ai Project 匯入，最後更新：2026-04-25 -->

---

## 一、專案概覽

**名稱：** ROCSAUT Club Management Platform
**定位：** 先為 ROCSAUT（UofT 社團）打造，設計為可重用框架，長期可商業化
**開發者：** Foster（SUPERADMIN）— UofT 數學物理四年級，加拿大永久居民，來自台灣
**硬限制：** 2026 年 10 月起台灣義務役，所有開發必須在此之前完成

**GitHub：** https://github.com/flyincloud2001/club-platform
**生產環境：** https://rocsaut-club-platform.vercel.app
**本地路徑：** `C:\Users\flyin\OneDrive\桌面\開源代碼\社團平台`
**MemPalace 備份：** flyincloud2001/mempalace-backup

---

## 二、技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 16 + React 19 |
| 樣式 | Tailwind CSS 4 |
| 型別 | TypeScript |
| ORM | Prisma 7 |
| 資料庫 | Supabase（PostgreSQL） |
| 認證 | NextAuth v5 beta（Google OAuth，邀請制） |
| 部署 | Vercel（免費 Hobby tier） |
| Email | Resend（暫用 onboarding@resend.dev） |
| i18n | next-intl |
| 本地 AI | Ollama（hermes3、qwen2.5-abliterate:3b、qwen3:1.7b） |
| 訓練算力 | Kaggle + Google Colab（免費 GPU）；本地 1070（即將到貨） |

---

## 三、組織架構（ROCSAUT）

- **SUPER_ADMIN**（level 5）：跨社團最高權限，flyincloud2001@gmail.com 硬編碼例外
- **EXEC**（level 4）：President + 3 個 Vice President，可存取 /admin
- **TEAM_LEAD**（level 3）：各部門組長
- **MEMBER**（level 2）：一般社員
- 三個部門：Event、Marketing、Operation（未來可能新增 Internal Relations）
- 跨部門任務小組（TaskGroup）：由 VP/President 建立，成員可跨部門加入

---

## 四、目前進度（截至 2026-04-17）

### 已完成（Module 0–5）

| Module | 名稱 | 狀態 |
|--------|------|------|
| 0 | Foundation（設定層、DB、認證授權） | ✅ 完成 |
| 1 | 公開網站（首頁、活動、成員、成就、贊助商） | ✅ 完成 |
| 2 | 成員入口（個人資料、報名、出席、公告） | ✅ 完成 |
| 3 | 執委工具（任務群組、任務看板、討論區、投票） | ✅ 完成 |
| 4 | 管理後台（成員/活動/內容/報表管理） | ✅ 完成 |
| 5 | 贊助商管理（展示、後台 CRUD、歷史記錄） | ✅ 完成 |

整合測試於 2026-04-17 完成，7 條路徑全數通過。

### 待辦（Module 6+）

| Module | 名稱 | 狀態 |
|--------|------|------|
| 6 | 校友網路 | 未開始 |
| 7 | 財務管理 | 未開始 |
| 8 | 周邊商店（Shopify 整合） | 未開始 |
| 9 | 多租戶擴展 | 未開始 |

**下一步決策：** Module 6（校友網路）或直接進入模型訓練階段

---

## 五、已解決的重大 Bug

1. middleware i18n matcher 誤處理所有 /api/* 路由（307 → 404）
2. 所有 Admin 表單缺少 try-catch-finally（永久 loading）
3. WAITLISTED 功能完整移除（grep 清除，ARCHITECTURE.md 明令禁止重新引入）
4. 報名容量 race condition（改用 DB transaction + advisory lock）
5. 出席率分母邏輯錯誤（只計算 REGISTERED 狀態）
6. SponsorsSection onError 導致 Server Component 崩潰
7. locale switcher /en/en 雙重疊加 bug
8. OAuthAccountNotLinked（加入 allowDangerousEmailAccountLinking: true）
9. /zh/exec 404（路由結構修復）

---

## 六、所有頁面 URL

### 公開
- https://rocsaut-club-platform.vercel.app/zh/
- https://rocsaut-club-platform.vercel.app/zh/events
- https://rocsaut-club-platform.vercel.app/zh/members
- https://rocsaut-club-platform.vercel.app/zh/achievements
- https://rocsaut-club-platform.vercel.app/zh/sponsors
- https://rocsaut-club-platform.vercel.app/zh/contact
- https://rocsaut-club-platform.vercel.app/zh/login

### 成員
- https://rocsaut-club-platform.vercel.app/zh/dashboard

### 執委
- https://rocsaut-club-platform.vercel.app/zh/exec/task-groups
- https://rocsaut-club-platform.vercel.app/zh/exec/departments

### 後台
- https://rocsaut-club-platform.vercel.app/zh/admin
- https://rocsaut-club-platform.vercel.app/zh/admin/members
- https://rocsaut-club-platform.vercel.app/zh/admin/events
- https://rocsaut-club-platform.vercel.app/zh/admin/announcements
- https://rocsaut-club-platform.vercel.app/zh/admin/reports
- https://rocsaut-club-platform.vercel.app/zh/admin/sponsors
- https://rocsaut-club-platform.vercel.app/zh/admin/achievements
- https://rocsaut-club-platform.vercel.app/zh/admin/site-config

（所有 /zh/ 路徑均有 /en/ 英文版對應）

---

## 七、關鍵架構決策

1. **Prisma migration 限制：** 不能直接對 Supabase 執行，schema 變更需透過 Supabase SQL Editor 手動執行，再 commit 生成的 Prisma client
2. **Vercel DB 連線：** 必須用 Supabase connection pooler（port 6543），不是 direct（port 5432）
3. **DB 密碼：** 只能用英數字元，否則 URL 解析失敗
4. **src/generated/prisma/ 必須 commit：** 否則 Vercel build 失敗
5. **Google OAuth + UofT：** UofT 用 Microsoft/Outlook，無法限制 utoronto.ca domain
6. **WAITLISTED 永久禁止：** 已完整清除，不得重新引入
7. **EXEC（level 4）保留 /admin 存取：** 刻意設計，不是 bug
8. **allowDangerousEmailAccountLinking: true：** 解決 Gmail 帳號 OAuth 連結問題
9. **基礎設施抽象原則：** DB/storage/auth/deployment 均可透過 config.yaml 切換，不需動業務邏輯

---

## 八、待處理基礎設施項目

- [ ] rocsaut.ca domain 驗證（Resend 寄件地址正式化）
- [ ] CRON_SECRET 在 Vercel 手動設定
- [ ] EMAIL_FROM 在 Vercel 手動設定

---

## 九、DB 模型摘要（schema.prisma）

| 模型 | 說明 |
|------|------|
| User | 使用者，Google OAuth，RBAC role |
| Account | NextAuth OAuth 帳號關聯表 |
| Session | NextAuth 資料庫 Session |
| VerificationToken | Magic Link token（未啟用） |
| Department | 固定部門（event/marketing/operation） |
| Event | 活動（含容量、發布狀態） |
| Registration | 報名記錄（REGISTERED/CANCELLED + attendedAt） |
| Discussion | 討論區（活動或任務群組各一） |
| Comment | 留言（支援匿名） |
| Announcement | 公告（含已讀標記） |
| AnnouncementRead | 公告已讀記錄 |
| TaskGroup | 跨部門任務群組（ACTIVE/COMPLETED/ARCHIVED） |
| TaskGroupMember | 群組成員中間表（LEADER/MEMBER） |
| Task | 任務（TODO/IN_PROGRESS/DONE，含截止日） |
| Vote | 投票（任務群組內） |
| VoteOption | 投票選項 |
| VoteResponse | 投票回應（防重複） |
| Sponsor | 贊助商 |
| SponsorHistory | 贊助歷史（年份+tier） |
| SiteConfig | 全域設定 key-value（Hero 背景圖等） |
| Achievement | 過往成就（年份+標題+圖片） |

---

## 十、角色分工原則

| 角色 | 負責 |
|------|------|
| Claude（協調者） | 架構規劃、需求分析、決策制定、品質驗證 |
| Claude Code（執行者） | 程式碼生成、複雜邏輯、自我診斷/修復 |
| Foster | 執行 Claude Code 指令、最終決策 |

**規則：**
- Claude 不生成程式碼（協調者角色）
- Claude Code 指令必須完整自洽，包含驗證步驟
- 任務批次化為單一 Claude Code 指令，不分多次執行
- 討論完成前不生成指令

---

## 十一、費用估算（月）

| 項目 | 費用 |
|------|------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Cloudflare R2 | 視儲存量（$0.015/GB） |
| Resend | $0（每月 <3000 封） |
| rocsaut.ca 網域 | ~$1.25（$15/年） |
| **合計** | **~$46/月** |

---

## 十二、長期願景（AI 系統）

- **協調者**（現在：Claude → 未來：訓練好的本地模型）
- **執行者**（目標：Qwen2.5-Coder-abliterated，7B/14B 本地，32B on Kaggle）
- **觀察者模組**：獨立運行，防止 groupthink，收集訓練數據
- **競爭模組**（長期）：兩個模型競爭輸出，觀察者萃取最佳結果
- **MemPalace**：累積記憶系統

---

## 十三、Project 所有對話 URL

| 標題 | URL |
|------|-----|
| 考試結束後的任務規劃 | /chat/65a7a321-b8e7-4253-9269-c2ab0c75d70d |
| 社團app中整合AI聊天室的可行性 | /chat/46f34a2c-2dde-428c-bc9f-cecb002ddc82 |
| 登入後導向後台控制端、社團方案討論 | /chat/6e628ee7-189c-4170-b2c2-5550ac369fa2 |
| ROCSAUT 社團平台整合測試規劃 | /chat/6d526a0e-322a-4aa2-83e9-4aae3a3dc8fe |
| 社團平台推廣策略 | /chat/1b243b0f-9609-4eac-891b-4bcee8ea8a6a |
| ROCSAUT 社團平台 Module 5 規劃與架構 | /chat/de9e99b9-12f5-4238-bd32-1131b7c196b4 |
| ROCSAUT 社團平台 Module 4 規劃 | /chat/74de235b-1b74-4c55-9b61-298541d98ed1 |
| ROCSAUT 社團平台 Module 3 規劃與部署 | /chat/cb4a3656-b033-4671-8129-2cd476d4b7aa |
| ROCSAUT 社團平台 Module 2 架構規劃 | /chat/8baf4c6d-20c4-4d0e-bd73-81863a7d623d |
| ROCSAUT 社團平台 Module 1 公開網站開發規劃 | /chat/b998e46b-d8b3-48b2-b23c-138154b0c4f5 |
| 完成Foundation(Module 0) | /chat/ef25c6b9-9d41-4854-a2c5-55cfd4770050 |
| Mempalace架設 | /chat/4b431f0b-1961-46fc-8648-0575fafc767b |
| ROCSAUT社團平台架構設計 | /chat/e22bead2-1c24-4eb7-a57c-f1b8f9fe4d0d |
| Next.js 社團平台 Vercel 部署設定 | /chat/59600fd8-1e89-4555-8f4f-66dc0ebf96a4 |
| Google OAuth 設定 Next.js 社團平台 | /chat/3a31838f-1c7a-4d61-ac6a-30728d4461f3 |
| Supabase 初始設定與環境變數配置 | /chat/67390e29-8e54-4b53-9e1f-f990113ef603 |
| 系統與計畫總覽 | /chat/5bb190e7-dee6-4f12-93d6-92539b8fa7f9 |
| Hacking System | /chat/defb26eb-a3af-4366-b19b-e9e84848b9f5 |
| 本地AI系統架構開發 | /chat/95f02d2d-9463-4594-80af-57587e2e1710 |

---

## 十四、時間線

| 時間 | 目標 |
|------|------|
| 2026 年 4 月底 | ROCSAUT 平台完成；MemPalace 同步收集數據 |
| ROCSAUT 完成後 | 開始訓練開源模型（Kaggle + Colab，不等待額外硬體） |
| 1070 到貨後 | 補充本地訓練算力 |
| 2026 年 10 月前 | Coordinator + Executor 系統完整運行 |
| 2026/10 – 2027/1 | 台灣義務役 |
| 役畢後 | 回加拿大，啟動販賣機事業，找 Junior Analyst 工作 |

---

*最後由 Claude Cowork 匯入於 2026-04-25*
