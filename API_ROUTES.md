# API Routes

完整 API 端點文件。所有端點位於 `/api/` 路徑下。

認證方式：
- **Cookie session**：NextAuth 標準 cookie（瀏覽器）
- **Bearer token**：`Authorization: Bearer <JWT>`（行動 App，使用 `/api/auth/token` 取得）

角色等級（RBAC）：
| 角色 | Level |
|------|-------|
| SUPER_ADMIN | 5 |
| ADMIN | 4 |
| EXEC | 3 |
| MEMBER | 2 |
| PUBLIC | 1 |

---

## 公開端點（無需登入）

| Method | Path | Description | Query Params |
|--------|------|-------------|--------------|
| GET | `/api/achievements` | 列出所有成果 | `year?` — 年份篩選 |
| GET | `/api/site-config` | 取得所有網站全域設定（key-value 物件） | — |
| GET | `/api/sponsors` | 列出所有贊助商（含歷年贊助記錄） | `year?` — 篩選有該年度贊助的贊助商 |
| GET | `/api/events/[id]` | 取得單一活動詳情（已發布）；若攜帶有效 token 一併回傳報名狀態 | — |
| POST | `/api/auth/token` | 行動 App Google OAuth code exchange，回傳 JWT token | — |
| POST | `/api/contact` | 聯絡表單送出 | — |

---

## Portal 端點（需登入，MEMBER+，level ≥ 2）

支援 cookie session 和 Authorization: Bearer token。

| Method | Path | Description | Min Level |
|--------|------|-------------|-----------|
| GET | `/api/announcements` | 列出已發布公告（含當前使用者已讀狀態） | 2 (MEMBER) |
| GET | `/api/announcements/[id]` | 取得單一公告詳情 | 2 (MEMBER) |
| POST | `/api/announcements/[id]/read` | 標記公告為已讀 | 2 (MEMBER) |
| GET | `/api/user/profile` | 取得當前使用者個人資料 | 2 (MEMBER) |
| PATCH | `/api/user/profile` | 更新個人資料（name, image） | 2 (MEMBER) |
| POST | `/api/events/[id]/register` | 報名活動（含容量檢查） | 2 (MEMBER) |
| DELETE | `/api/events/[id]/register` | 取消報名 | 2 (MEMBER) |
| GET | `/api/exec/task-groups` | 列出任務群組 | 3 (EXEC) |
| POST | `/api/exec/task-groups` | 建立任務群組 | 3 (EXEC) |
| GET | `/api/exec/task-groups/[id]/tasks` | 列出群組任務 | 3 (EXEC) |
| POST | `/api/exec/task-groups/[id]/tasks` | 新增群組任務 | 3 (EXEC) |
| PATCH | `/api/exec/task-groups/[id]/tasks/[taskId]` | 更新任務 | 3 (EXEC) |
| DELETE | `/api/exec/task-groups/[id]/tasks/[taskId]` | 刪除任務（群組 Leader 或全域 level≥3） | 3 (EXEC) |
| GET | `/api/exec/task-groups/[id]/members` | 列出群組成員 | 3 (EXEC) |
| POST | `/api/exec/task-groups/[id]/members` | 新增群組成員 | 3 (EXEC) |
| DELETE | `/api/exec/task-groups/[id]/members/[userId]` | 移除群組成員 | 3 (EXEC) |
| PATCH | `/api/exec/task-groups/[id]/members/[userId]/role` | 更新群組成員角色 | 3 (EXEC) |
| PATCH | `/api/exec/task-groups/[id]/status` | 更新群組狀態 | 3 (EXEC) |
| GET | `/api/exec/task-groups/[id]/discussion` | 取得群組討論區 | 3 (EXEC) |
| GET | `/api/exec/task-groups/[id]/discussion/comments` | 列出討論留言 | 3 (EXEC) |
| POST | `/api/exec/task-groups/[id]/discussion/comments` | 新增討論留言 | 3 (EXEC) |
| PATCH | `/api/exec/task-groups/[id]/discussion/comments/[commentId]` | 更新討論留言 | 3 (EXEC) |
| DELETE | `/api/exec/task-groups/[id]/discussion/comments/[commentId]` | 刪除討論留言 | 3 (EXEC) |
| GET | `/api/exec/task-groups/[id]/votes` | 列出群組投票 | 3 (EXEC) |
| POST | `/api/exec/task-groups/[id]/votes` | 建立投票（群組 Leader 或全域 level≥3） | 3 (EXEC) |
| POST | `/api/exec/task-groups/[id]/votes/[voteId]/respond` | 投票回應 | 3 (EXEC) |
| PATCH | `/api/exec/task-groups/[id]/votes/[voteId]/close` | 關閉投票（投票建立者） | 3 (EXEC) |

### Portal 版端點（行動 App 優先，支援 Bearer token）

| Method | Path | Description | Min Level |
|--------|------|-------------|-----------|
| GET | `/api/portal/profile` | 取得當前使用者個人資料（支援 Bearer） | 2 (MEMBER) |
| PATCH | `/api/portal/profile` | 更新個人資料（支援 Bearer） | 2 (MEMBER) |
| POST | `/api/portal/announcements/[id]/read` | 標記公告為已讀（支援 Bearer） | 2 (MEMBER) |

---

## Exec 端點（EXEC+，level ≥ 3）

| Method | Path | Description | Min Level |
|--------|------|-------------|-----------|
| GET | `/api/admin/events` | 列出所有活動（含草稿） | 3 (EXEC) |
| POST | `/api/admin/events` | 建立新活動 | 3 (EXEC) |
| GET | `/api/admin/events/[id]` | 取得活動詳情（後台） | 3 (EXEC) |
| PUT | `/api/admin/events/[id]` | 更新活動 | 3 (EXEC) |
| DELETE | `/api/admin/events/[id]` | 刪除活動 | 5 (SUPER_ADMIN) |
| PATCH | `/api/admin/events/[id]/publish` | 發布 / 取消發布活動 | 3 (EXEC) |
| PATCH | `/api/admin/events/[id]/registrations/[registrationId]/attend` | 標記出席 | 3 (EXEC) |
| POST | `/api/announcements` | 建立公告 | 3 (EXEC) |
| PUT | `/api/announcements/[id]` | 更新公告 | 3 (EXEC) |
| DELETE | `/api/announcements/[id]` | 刪除公告 | 3 (EXEC) |
| PATCH | `/api/announcements/[id]/publish` | 發布 / 取消發布公告 | 3 (EXEC) |
| POST | `/api/sponsors` | 新增贊助商 | 3 (EXEC) |
| GET | `/api/sponsors/[id]` | 取得單一贊助商（後台，含歷史記錄） | 3 (EXEC) |
| PATCH | `/api/sponsors/[id]` | 更新贊助商 | 3 (EXEC) |
| DELETE | `/api/sponsors/[id]` | 刪除贊助商 | 3 (EXEC) |
| GET | `/api/sponsors/[id]/history` | 列出贊助年度記錄 | 3 (EXEC) |
| POST | `/api/sponsors/[id]/history` | 新增贊助年度記錄 | 3 (EXEC) |
| DELETE | `/api/sponsors/[id]/history/[historyId]` | 刪除贊助年度記錄 | 3 (EXEC) |

---

## Admin 端點（ADMIN+，level ≥ 4）

| Method | Path | Description | Min Level |
|--------|------|-------------|-----------|
| GET | `/api/admin/departments` | 列出所有部門（含成員數） | 4 (ADMIN) |
| GET | `/api/admin/departments/[id]/members` | 取得指定部門成員列表（id 或 slug） | 4 (ADMIN) |
| GET | `/api/admin/members` | 列出所有成員（含 department） | 4 (ADMIN) |
| PATCH | `/api/admin/members/[id]` | 更新成員角色或部門 | 4 (ADMIN) |
| POST | `/api/admin/members/import` | 批次匯入成員 | 4 (ADMIN) |
| GET | `/api/admin/achievements` | 列出所有成果（後台，含未發布） | 4 (ADMIN) |
| POST | `/api/admin/achievements` | 建立新成果 | 4 (ADMIN) |
| PATCH | `/api/admin/achievements/[id]` | 更新成果 | 4 (ADMIN) |
| DELETE | `/api/admin/achievements/[id]` | 刪除成果 | 4 (ADMIN) |
| GET | `/api/admin/site-config` | 讀取單一設定值（?key=...） | 公開 |
| PATCH | `/api/admin/site-config` | 更新設定值 | 4 (ADMIN) |
| GET | `/api/admin/alumni` | 列出所有校友（含隱藏記錄） | 4 (ADMIN) |
| POST | `/api/admin/alumni` | 建立新校友記錄 | 4 (ADMIN) |
| PATCH | `/api/admin/alumni/[id]` | 更新校友資料 | 4 (ADMIN) |
| DELETE | `/api/admin/alumni/[id]` | 刪除校友記錄 | 4 (ADMIN) |
| GET | `/api/admin/reports/members` | 成員報表 | 4 (ADMIN) |
| GET | `/api/admin/reports/attendance` | 出席報表 | 4 (ADMIN) |
| GET | `/api/admin/reports/export` | 匯出報表（CSV） | 4 (ADMIN) |
| PATCH | `/api/exec/departments/[slug]/members/[userId]/role` | 更新部門成員全域角色（限 EXEC/MEMBER） | 5 (SUPER_ADMIN) |

---

## 特殊端點

| Method | Path | Description | 驗證 |
|--------|------|-------------|------|
| ALL | `/api/auth/[...nextauth]` | NextAuth v5 OAuth handler（Google） | 內部 |
| POST | `/api/cron/task-reminder` | Cron job 任務提醒（Vercel Cron） | CRON_SECRET header |

---

## 認證流程

### 瀏覽器（NextAuth 標準流程）
1. 使用者點擊登入 → 導向 `/api/auth/signin`
2. Google OAuth callback → session cookie 自動設定
3. 後續請求自動帶 cookie

### 行動 App（JWT Bearer Token）
1. App 取得 Google OAuth 授權碼（`code`）
2. `POST /api/auth/token` 交換取得 JWT token
3. 後續請求在 `Authorization: Bearer <token>` header 帶上 token
4. Token 有效期 30 天
