/**
 * lib/data/achievements.ts — 過往成果假資料
 *
 * 定義 Achievement 型別並提供靜態假資料，
 * 供過往成果列表頁、詳情頁使用。
 *
 * 年份篩選由前端列表頁元件負責，此檔案只提供原始資料。
 *
 * TODO: 完成資料庫層（Module 0.3）後，將 ACHIEVEMENTS 陣列替換為 Prisma 查詢。
 *       屆時此檔案應改為從 lib/db.ts 匯出的查詢函式。
 *       參考 ARCHITECTURE.md → 4.3.4 過往成果內容管理介面
 */

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

/**
 * Achievement — 過往成果資料型別
 *
 * 對應未來 Prisma schema 中的 Achievement model。
 */
export interface Achievement {
  /** 成果唯一識別碼（未來改用資料庫主鍵 / UUID） */
  id: string;

  /** 成果標題 */
  title: string;

  /**
   * 年份（西元年）
   * 用於前端年份篩選功能，未來可改為 Date 型別精確到月份
   */
  year: number;

  /**
   * 成果描述（完整段落，支援換行）
   * TODO: 替換為 Markdown / Rich Text（CMS）
   */
  description: string;

  /**
   * 封面圖片 URL
   * TODO: 替換為上傳至 Supabase Storage 的真實圖片路徑。
   *       目前使用 placehold.co 佔位圖片。
   */
  image: string;
}

// ─── 假資料 ───────────────────────────────────────────────────────────────────

/**
 * ACHIEVEMENTS — 靜態假過往成果陣列
 *
 * 包含 6 筆成果，年份分散於 2020–2025，
 * 涵蓋迎新晚宴、文化節、學術競賽、社區服務、周年慶等多種類型。
 *
 * TODO: 替換為 Prisma 查詢。
 *       範例：export async function getAchievements() {
 *               return prisma.achievement.findMany({
 *                 orderBy: { year: 'desc' }
 *               })
 *             }
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach-001",
    title: "創社首屆迎新晚宴——ROCSAUT 正式成立",
    year: 2020,
    description:
      "2020 年秋季，ROCSAUT 正式在多倫多大學成立，首屆迎新晚宴吸引超過 60 名台灣學生參與。\n\n活動於 Woodsworth College 舉行，現場展示台灣文化特色並邀請多位資深校友分享在加求學與工作的經驗。這場活動為社團奠定了友善、溫暖的社群文化基調，許多現在的核心幹部就是在這場活動中相識的。\n\n這個里程碑標誌著多倫多台灣學生社群正式有了一個專屬的家。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2020+Kickoff",
  },
  {
    id: "ach-002",
    title: "首屆台灣文化節——逾 300 人參與",
    year: 2021,
    description:
      "2021 年秋季，ROCSAUT 首次舉辦大規模對外文化活動「台灣文化節」，現場吸引超過 300 名多倫多大學師生與多倫多市民參與，創下社團活動規模新高。\n\n活動設有台灣美食攤位（珍珠奶茶、鹽酥雞、肉圓等）、台灣傳統服飾展示、書法體驗，以及台灣原住民音樂表演。活動現場媒體曝光達 1,500 人次，成功向加拿大主流社會展示台灣豐富的文化底蘊。\n\n此活動獲得多倫多大學學生會（UTSU）文化活動特優獎，是社團第一個正式外部榮譽。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2021+Culture+Fest",
  },
  {
    id: "ach-003",
    title: "UTSU 最佳新興社團獎",
    year: 2021,
    description:
      "成立不到一年，ROCSAUT 榮獲多倫多大學學生會（University of Toronto Students' Union）年度「最佳新興社團獎（Best Emerging Club）」。\n\n評審委員會特別表揚社團在活動多樣性、成員凝聚力與校園影響力三方面的傑出表現。得獎消息在台灣學生社群引發熱烈迴響，吸引大批新成員加入，成員數從創社的 40 人成長至 150 人。\n\n這個獎項是對全體創社成員辛勤付出的最好回報，也激勵了後續幹部更積極地開創新活動形式。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2021+UTSU+Award",
  },
  {
    id: "ach-004",
    title: "春節晚會——台灣元素融入加拿大年節",
    year: 2022,
    description:
      "2022 年，ROCSAUT 首次與多倫多唐人街文化協會合辦春節晚宴，以「在加拿大過台灣年」為主題，活動規模達 180 人次。\n\n晚宴融合台式圍爐傳統與加拿大在地元素，邀請舞龍舞獅表演隊與台灣傳統布袋戲劇團共同演出。活動現場播放多位畢業校友的「異鄉過年回憶」影片，感動無數在場成員。\n\n此活動奠定了 ROCSAUT 每年舉辦春節晚會的傳統，成為台灣學生在加拿大最重要的年節聚會。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2022+Lunar+New+Year",
  },
  {
    id: "ach-005",
    title: "社區服務計畫——台灣學生導師配對",
    year: 2023,
    description:
      "2023 年，ROCSAUT 啟動「台灣學生導師計畫（ROCSAUT Mentorship Program）」，系統性地為新生配對在多倫多就讀 2 年以上的學長姐。\n\n首屆計畫共配對 42 組 mentor-mentee，涵蓋理工、商學、人文等多個學院。三個月的計畫期間舉辦 4 場線上/線下工作坊，主題包括選課指南、求職準備、心理健康與生活適應。\n\n成果報告顯示，85% 的參與新生表示計畫顯著提升了他們在異鄉生活的安全感與歸屬感，此計畫已成為社團每年延續的核心服務項目。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2023+Mentorship",
  },
  {
    id: "ach-006",
    title: "五週年社慶——百人晚宴暨成果展",
    year: 2025,
    description:
      "2025 年，ROCSAUT 迎來創社五週年，特別舉辦盛大的周年晚宴暨成果展，吸引超過 150 名現任成員、校友與嘉賓齊聚慶祝。\n\n晚宴現場展示五年來的重要成就，包括歷屆活動照片牆、各項獲獎紀錄與成員成長數據。活動邀請首屆創社幹部回台分享創社初衷，並發表社團未來五年發展藍圖，宣布正式啟動多租戶社團管理平台的開發計畫。\n\n五年來，ROCSAUT 已從 40 人的小型社團成長為擁有 300+ 成員的多倫多最大台灣學生組織，是每一位曾參與的成員共同寫下的故事。",
    image: "https://placehold.co/800x450/1a2744/c9b99a?text=2025+5th+Anniversary",
  },
];

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

/**
 * getAchievementById — 依 id 查找單筆成果
 *
 * TODO: 替換為 prisma.achievement.findUnique({ where: { id } })
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * getAllAchievements — 取得所有成果，依年份降冪排序（最新在前）
 *
 * TODO: 替換為 prisma.achievement.findMany({ orderBy: { year: 'desc' } })
 */
export function getAllAchievements(): Achievement[] {
  return [...ACHIEVEMENTS].sort((a, b) => b.year - a.year);
}

/**
 * getAchievementYears — 取得所有成果的年份清單（去重、降冪）
 * 供年份篩選元件使用。
 *
 * TODO: 替換為 prisma.achievement.groupBy({ by: ['year'], orderBy: { year: 'desc' } })
 */
export function getAchievementYears(): number[] {
  const years = [...new Set(ACHIEVEMENTS.map((a) => a.year))];
  return years.sort((a, b) => b - a);
}
