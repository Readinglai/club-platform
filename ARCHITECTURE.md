# ARCHITECTURE — ROCSAUT Club Platform

## 實際實作備註（與原始規劃的差異）

### Schema 重大變更
原始規劃的 `Team` model 已拆分為兩個獨立 model：
- `Department`：固定部門（Event、Marketing、Operation），對應 config.yaml 的 teams 設定
- `TaskGroup`：動態任務小組，由 exec 層級建立，成員可跨部門，有生命週期（ACTIVE / COMPLETED / ARCHIVED）

### 組織結構說明（ROCSAUT）
- President 和 Vice President 對應 role level 4（exec），權限相同
- 三個 Vice President 分別管理 Event、Operation、Marketing 部門
- 任務小組由 VP 或 President 建立，指派 Team Leader 領導，成員可同時加入多個小組
- 未來可能新增 Internal Relation 部門

### 跳過的子任務
- 3.3.4 便條元件：已跳過，Discord pins 可替代
- 社團議題投票：已跳過，Discord 投票功能可替代；僅保留任務小組旗下的投票

### 新增的 Model
- `TaskGroupMember`：TaskGroup 與 User 的多對多中間表，含 LEADER / MEMBER 角色
- `Vote`、`VoteOption`、`VoteResponse`：任務小組投票系統，防重複投票

### 環境變數新增
- `CRON_SECRET`：保護 cron endpoint（需在 Vercel 手動設定）
- `EMAIL_FROM`：Resend 寄件地址（需在 Vercel 手動設定）

---

## Foundation

### 0.1 設定層（Config Layer）

- 0.1.1 config.yaml schema 定義 `Claude Code`
- 0.1.2 設定讀取與驗證模組 `Claude Code`
- 0.1.3 環境變數管理 `Claude Code`
- 0.1.4 功能開關中介層 `Claude Code`

### 0.2 專案基礎架構

- 0.2.1 Monorepo 目錄結構 `Claude Code`
- 0.2.2 共用 TypeScript 型別定義 `Claude Code`
- 0.2.3 共用 UI 元件庫
- 0.2.4 共用 Layout
- 0.2.5 錯誤處理與 logging `Claude Code`

### 0.3 資料庫層

- 0.3.1 核心 schema 設計 `Claude Code`
- 0.3.2 Migration 腳本管理 `Claude Code`
- 0.3.3 Seed 資料
- 0.3.4 資料庫連線池設定 `Claude Code`

### 0.4 認證與授權

- 0.4.1 NextAuth.js 設定 `Claude Code`
- 0.4.2 RBAC 權限定義 `Claude Code`
- 0.4.3 權限中介層 `Claude Code`
- 0.4.4 登入/登出頁面 UI
- 0.4.5 未授權頁面

### 0.5 執行環境整合層

- 0.5.1 Ollama REST API 包裝模組 `Claude Code`
- 0.5.2 Kaggle API job 提交腳本 `Claude Code`
- 0.5.3 Colab endpoint 呼叫模組 `Claude Code`
- 0.5.4 執行環境健康檢查與自動切換 `Claude Code`

---

## Module 1：公開網站（Public Site）

### 1.1 首頁（Landing Page）

- 1.1.1 Hero section
- 1.1.2 About section
- 1.1.3 Contact 表單 + 送出 API `Claude Code`
- 1.1.4 地圖與地址元件

### 1.2 活動公告頁

- 1.2.1 活動列表頁
- 1.2.2 活動詳情頁
- 1.2.3 活動日曆元件

### 1.3 成員介紹頁

- 1.3.1 成員列表
- 1.3.2 成員個人介紹頁

### 1.4 過往成果頁

- 1.4.1 年份篩選元件
- 1.4.2 成就卡片
- 1.4.3 成就詳情頁

---

## Module 2：成員入口（Member Portal）

### 2.1 個人資料

- 2.1.1 個人資料頁（檢視）`Kaggle`
- 2.1.2 個人資料編輯表單
- 2.1.3 個人資料更新 API `Claude Code`
- 2.1.4 出席記錄查詢 UI
- 2.1.5 出席記錄 API `Claude Code`

### 2.2 活動報名

- 2.2.1 報名 API `Claude Code`
- 2.2.2 報名表單 UI
- 2.2.3 候補名單邏輯 `Claude Code`
- 2.2.4 出席打卡 API `Claude Code`
- 2.2.5 出席打卡 UI
- 2.2.6 Email 通知 `Claude Code`

### 2.3 公告閱覽

- 2.3.1 公告列表 UI
- 2.3.2 公告詳情頁
- 2.3.3 已讀標記 API `Claude Code`

---

## Module 3：執委內部工具（Exec Tools）

### 3.1 部門與任務小組管理

> 原規劃為 Team 管理；實作時拆分為 Department（固定部門）與 TaskGroup（動態任務小組）兩套系統。

- 3.1.1 部門成員列表 ✅
- 3.1.2 角色指派 API `Claude Code` ✅
- 3.1.3 角色指派介面（下拉選單，SUPER_ADMIN 限定）`Kaggle` ✅
- 3.1.4 跨部門任務小組概覽 ✅
- 3.1.5 任務小組建立 API + 自動加入建立者為 LEADER `Claude Code` ✅
- 3.1.6 任務小組成員管理 API（新增 / 移除 / 角色變更）`Claude Code` ✅
- 3.1.7 任務小組狀態更新 API（ACTIVE / COMPLETED / ARCHIVED）`Claude Code` ✅
- 3.1.8 任務小組建立表單 UI ✅
- 3.1.9 任務小組詳情頁與成員管理 UI ✅

### 3.2 任務管理

- 3.2.1 任務 CRUD API `Claude Code` ✅
- 3.2.2 任務建立/指派介面（含 Modal）`Kaggle` ✅
- 3.2.3 任務看板 UI（三欄 Kanban：TODO / IN_PROGRESS / DONE）`Colab` ✅
- 3.2.4 任務狀態追蹤與通知（狀態變更時寄信給 assignee）`Claude Code` ✅
- 3.2.5 任務截止日提醒（Vercel Cron，每日 UTC 09:00）`Claude Code` ✅

### 3.3 討論區與投票

- 3.3.1 討論區自動建立 API（TaskGroup 專屬，首次存取時 get-or-create）`Claude Code` ✅
- 3.3.2 討論留言 UI ✅
- 3.3.3 留言 API（支援匿名，isAnonymous=true 時 authorId 存 null）`Claude Code` ✅
- 3.3.4 便條元件 ⏭️ 跳過（Discord pins 可替代）
- 3.3.5 投票元件 UI（進度條、單選換票、關閉投票）`Colab` ✅
- 3.3.6 投票 API（建立 / 投票 / 關閉，防重複投票）`Claude Code` ✅
- 3.3.7 討論區任務指派 API `Claude Code` ⏭️ 跳過（Task.discussionId 已廢棄，改為 TaskGroup 層級）
- 3.3.8 討論區任務指派 UI ⏭️ 跳過（同上）

---

## Module 4：管理後台（Admin Panel）

### 4.1 成員管理

- 4.1.1 成員 CRUD API `Claude Code`
- 4.1.2 成員管理介面
- 4.1.3 批次匯入成員 `Claude Code`
- 4.1.4 出席記錄管理介面

### 4.2 活動管理

- 4.2.1 活動 CRUD API `Claude Code`
- 4.2.2 活動建立/編輯表單 UI
- 4.2.3 報名名單管理介面
- 4.2.4 活動發布/下架邏輯 `Claude Code`

### 4.3 內容管理

- 4.3.1 首頁各 section 內容編輯介面
- 4.3.2 圖片上傳與管理 API `Claude Code`
- 4.3.3 公告建立/編輯/刪除介面
- 4.3.4 過往成果內容管理介面

### 4.4 數據報表

- 4.4.1 出席率統計 API `Claude Code`
- 4.4.2 活動參與趨勢圖 UI
- 4.4.3 成員成長統計 UI
- 4.4.4 報表匯出 `Claude Code`

---

## Module 5：贊助商管理（Sponsors）

### 5.1 贊助商展示

- 5.1.1 分級展示 UI
- 5.1.2 年份篩選元件
- 5.1.3 贊助商詳情頁

### 5.2 贊助商後台

- 5.2.1 贊助商 CRUD API `Claude Code`
- 5.2.2 贊助商管理介面
- 5.2.3 贊助歷史記錄 `Claude Code`
- 5.2.4 贊助歷史記錄介面

---

## Module 6：校友網路（Alumni Network）

### 6.1 校友目錄

- 6.1.1 校友資料庫 API `Claude Code`
- 6.1.2 校友目錄 UI
- 6.1.3 校友個人頁
- 6.1.4 聯絡功能 `Claude Code`
- 6.1.5 校友自助更新資料介面

---

## Module 7：財務管理（Finance）

### 7.1 財務記錄

- 7.1.1 收支記錄 CRUD API `Claude Code`
- 7.1.2 財務記錄介面
- 7.1.3 預算追蹤 `Claude Code`
- 7.1.4 財務報表 UI
- 7.1.5 報表匯出 `Claude Code`

---

## Module 8：周邊商店（Merch Store）

### 8.1 商店整合

- 8.1.1 Shopify API 整合 `Claude Code`
- 8.1.2 商品展示頁
- 8.1.3 購物車元件
- 8.1.4 結帳跳轉 `Claude Code`

---

## Module 9：多租戶擴展（Multi-Tenant）

### 9.1 租戶管理

- 9.1.1 多租戶資料隔離 `Claude Code`
- 9.1.2 社團 onboarding 流程 API `Claude Code`
- 9.1.3 社團 onboarding UI
- 9.1.4 超級管理員介面

### 9.2 跨社團功能

- 9.2.1 跨社團活動 API `Claude Code`
- 9.2.2 跨社團活動 UI
- 9.2.3 校園公告系統 API `Claude Code`
- 9.2.4 校園公告系統 UI
