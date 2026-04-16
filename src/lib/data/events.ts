/**
 * lib/data/events.ts — 活動假資料
 *
 * 定義 Event 型別並提供靜態假資料，供各活動頁面（列表、詳情、日曆）使用。
 *
 * TODO: 完成資料庫層（Module 0.3）後，將 EVENTS 陣列替換為 Prisma 查詢。
 *       屆時此檔案應改為從 lib/db.ts 匯出的查詢函式，
 *       而非直接回傳靜態陣列。
 *       參考 ARCHITECTURE.md → 0.3.1 核心 schema 設計
 */

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

/**
 * Event — 活動資料型別
 *
 * 對應未來 Prisma schema 中的 Event model。
 * 欄位命名使用 camelCase，與 Prisma 慣例一致。
 */
export interface Event {
  /** 活動唯一識別碼（未來改用資料庫主鍵，例如 UUID） */
  id: string;

  /** 活動標題（支援雙語，目前用中文；TODO: 接 i18n CMS） */
  title: string;

  /** 活動開始日期時間（UTC） */
  date: Date;

  /** 活動結束日期時間（UTC） */
  endDate: Date;

  /** 活動地點（文字描述，TODO: 未來改為 locationId 關聯地點 model） */
  location: string;

  /** 活動詳細描述（Markdown，TODO: 接 CMS 或 rich text editor） */
  description: string;

  /** 報名截止日期時間（UTC）；null 表示無截止日 */
  registrationDeadline: Date | null;

  /** 活動名額；null 表示不限人數 */
  capacity: number | null;
}

// ─── 假資料 ───────────────────────────────────────────────────────────────────

/**
 * EVENTS — 靜態假活動資料陣列
 *
 * 包含 5 筆活動，日期分散於 2025–2026 不同月份，
 * 涵蓋各種類型的社團活動（迎新、文化、學術、社交、節慶）。
 *
 * TODO: 替換為資料庫查詢。
 *       範例：export async function getEvents() { return prisma.event.findMany(...) }
 */
export const EVENTS: Event[] = [
  {
    id: "event-001",
    title: "ROCSAUT 2025 秋季迎新茶會",
    date: new Date("2025-09-13T14:00:00-04:00"),
    endDate: new Date("2025-09-13T17:00:00-04:00"),
    location: "Multi-Faith Centre, University of Toronto, 569 Spadina Ave",
    description:
      "歡迎新舊成員參與年度迎新茶會！這是認識其他台灣同學、了解社團活動的最佳機會。現場備有台灣小吃與飲品，並安排自我介紹環節。\n\n活動內容：\n- 社團幹部介紹\n- 本學期活動預告\n- 自由交流與美食",
    registrationDeadline: new Date("2025-09-10T23:59:00-04:00"),
    capacity: 80,
  },
  {
    id: "event-002",
    title: "台灣美食文化節",
    date: new Date("2025-10-18T11:00:00-04:00"),
    endDate: new Date("2025-10-18T16:00:00-04:00"),
    location: "Hart House Great Hall, 7 Hart House Circle, Toronto",
    description:
      "年度台灣美食文化節！由社員手作道地台灣料理，包括珍珠奶茶、鹽酥雞、台式便當等。活動現場設有文化展覽區，展示台灣傳統服飾與節慶文化。\n\n特色活動：\n- 台灣小吃攤位（15+ 品項）\n- 文化知識問答競賽\n- 台灣特色禮品抽獎",
    registrationDeadline: new Date("2025-10-15T23:59:00-04:00"),
    capacity: 200,
  },
  {
    id: "event-003",
    title: "研究所申請分享會",
    date: new Date("2025-11-08T10:00:00-05:00"),
    endDate: new Date("2025-11-08T12:30:00-05:00"),
    location: "Bahen Centre for Information Technology, Room BA1210",
    description:
      "邀請已成功申請北美研究所的社員分享申請經驗，涵蓋 CS、商科、工程、理科等多個領域。分享主題包括選校策略、SOP 撰寫、推薦信準備，以及面試技巧。\n\n議程：\n- 10:00 開場與講者介紹\n- 10:10 各領域分享（每人 15 分鐘）\n- 11:30 Q&A 時間\n- 12:00 自由交流",
    registrationDeadline: new Date("2025-11-05T23:59:00-05:00"),
    capacity: 60,
  },
  {
    id: "event-004",
    title: "聖誕交換禮物派對",
    date: new Date("2025-12-06T18:00:00-05:00"),
    endDate: new Date("2025-12-06T21:00:00-05:00"),
    location: "GSU Pub, 16 Bancroft Ave, Toronto",
    description:
      "年末聖誕派對！攜帶一份 $15–$25 加幣的包裝禮物參加交換活動。現場有熱飲、小點心，以及各種互動遊戲。\n\n注意事項：\n- 請攜帶包裝好的禮物（價格 $15–25 CAD）\n- 歡迎穿著節慶服裝\n- 限 19 歲以上（酒精飲品需出示證件）",
    registrationDeadline: new Date("2025-12-03T23:59:00-05:00"),
    capacity: 50,
  },
  {
    id: "event-005",
    title: "農曆新年晚宴 2026",
    date: new Date("2026-02-07T18:30:00-05:00"),
    endDate: new Date("2026-02-07T21:30:00-05:00"),
    location: "Victoria University Alumni Hall, 150 Charles St W, Toronto",
    description:
      "歡慶農曆蛇年到來！盛大年夜飯宴席，現場有舞龍舞獅表演、才藝秀及幸運抽獎。穿上喜慶服裝一起迎接新年！\n\n活動亮點：\n- 12 道菜年夜飯套餐\n- 舞龍舞獅表演\n- 社員才藝秀\n- 幸運大抽獎（獎品價值超過 $500 CAD）",
    registrationDeadline: new Date("2026-01-31T23:59:00-05:00"),
    capacity: 120,
  },
];

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

/**
 * getEventById — 依 id 查找單筆活動
 *
 * TODO: 替換為 prisma.event.findUnique({ where: { id } })
 *
 * @param id 活動 id
 * @returns 找到的活動，或 undefined
 */
export function getEventById(id: string): Event | undefined {
  return EVENTS.find((event) => event.id === id);
}

/**
 * getAllEvents — 取得所有活動，依日期升冪排序
 *
 * TODO: 替換為 prisma.event.findMany({ orderBy: { date: 'asc' } })
 *
 * @returns 活動陣列（升冪排序）
 */
export function getAllEvents(): Event[] {
  return [...EVENTS].sort((a, b) => a.date.getTime() - b.date.getTime());
}
