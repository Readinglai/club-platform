/**
 * lib/data/members.ts — 成員假資料
 *
 * 定義 Member 型別並提供靜態假資料，供成員列表頁、個人介紹頁使用。
 *
 * Department / Role 對應 config.yaml 的 teams 與 roles 設定：
 *   departments: event | marketing | operation
 *   roles: super_admin | exec | team_lead | member
 *
 * TODO: 完成資料庫層（Module 0.3）後，將 MEMBERS 陣列替換為 Prisma 查詢。
 *       屆時此檔案應改為從 lib/db.ts 匯出的查詢函式。
 *       參考 ARCHITECTURE.md → 0.3.1 核心 schema 設計
 *       參考 config.yaml → teams、roles 設定
 */

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

/**
 * MemberDepartment — 社團執行部門（對應 config.yaml teams[].id）
 * 目前三個部門：活動、行銷、營運
 */
export type MemberDepartment = "event" | "marketing" | "operation";

/**
 * MemberRole — 成員職位層級（對應 config.yaml roles[].id）
 * 由高到低：超級管理員 > 執委 > Team Lead > 一般成員
 */
export type MemberRole = "super_admin" | "exec" | "team_lead" | "member";

/**
 * Member — 成員資料型別
 *
 * 對應未來 Prisma schema 中的 User model（公開欄位部分）。
 * 非公開欄位（email、studentId 等）不在此型別中。
 */
export interface Member {
  /** 成員唯一識別碼（未來改用資料庫主鍵 / UUID） */
  id: string;

  /** 顯示姓名（中文姓名或英文名） */
  name: string;

  /**
   * 頭像圖片 URL
   * TODO: 替換為上傳至 Supabase Storage 的真實頭像。
   *       目前使用 placehold.co 佔位圖片，不需要 Next.js 遠端圖片設定。
   *       格式：https://placehold.co/{寬}x{高}/{背景色}/{文字色}?text={縮寫}
   */
  avatar: string;

  /**
   * 職位（對應 config.yaml roles[].id）
   * TODO: 替換為 Prisma User.role 欄位（Enum）
   */
  role: MemberRole;

  /**
   * 所屬部門（對應 config.yaml teams[].id，Prisma: User.departmentId）
   * TODO: 替換為 Prisma User.departmentId FK
   */
  department: MemberDepartment;

  /**
   * 個人簡介（自我介紹文字）
   * TODO: 替換為 Prisma User.bio 欄位
   */
  bio: string;
}

// ─── 職位與部門的顯示名稱對照 ────────────────────────────────────────────────

/** ROLE_LABELS — 職位 ID → 中文顯示名稱 */
export const ROLE_LABELS: Record<MemberRole, string> = {
  super_admin: "超級管理員",
  exec: "執行委員",
  team_lead: "Team Lead",
  member: "成員",
};

/** DEPARTMENT_LABELS — 部門 ID → 中文顯示名稱（對應 config.yaml teams[].name） */
export const DEPARTMENT_LABELS: Record<MemberDepartment, string> = {
  event: "Event Team",
  marketing: "Marketing Team",
  operation: "Operation Team",
};

/** DEPARTMENT_LABELS_EN — 部門 ID → 英文顯示名稱 */
export const DEPARTMENT_LABELS_EN: Record<MemberDepartment, string> = {
  event: "Event Team",
  marketing: "Marketing Team",
  operation: "Operation Team",
};

// ─── 假資料 ───────────────────────────────────────────────────────────────────

/**
 * MEMBERS — 靜態假成員資料陣列
 *
 * 包含 6 筆成員資料，涵蓋 event、marketing、operation 三個 team，
 * 職位分布從 exec 到 member。
 *
 * TODO: 替換為 Prisma 查詢。
 *       範例：export async function getMembers() {
 *               return prisma.user.findMany({
 *                 where: { role: { not: 'public' } },
 *                 select: { id, name, avatar, role, team, bio }
 *               })
 *             }
 */
export const MEMBERS: Member[] = [
  {
    id: "member-001",
    name: "陳怡君",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=YC",
    role: "exec",
    department: "event",
    bio: "就讀多倫多大學電腦科學系三年級，負責統籌社團各項活動的規劃與執行。喜歡籌備大型活動，享受看到大家在活動中相遇的時刻。課餘時間喜歡烹飪台灣料理和打排球。",
  },
  {
    id: "member-002",
    name: "林志豪",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=ZL",
    role: "team_lead",
    department: "event",
    bio: "多倫多大學電機工程碩士生，負責協調活動現場佈置與技術支援。熱愛攝影，擅長捕捉活動精彩瞬間。曾擔任台灣多所大學學生會活動組長，擁有豐富的大型活動執行經驗。",
  },
  {
    id: "member-003",
    name: "王雅婷",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=YW",
    role: "exec",
    department: "marketing",
    bio: "多倫多大學商學院三年級，主修 Marketing。負責社群媒體經營、活動宣傳與品牌設計。擅長 Canva、Adobe Illustrator，每次活動海報都出自她手。熱愛韓流文化與咖啡。",
  },
  {
    id: "member-004",
    name: "張俊宏",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=JZ",
    role: "team_lead",
    department: "marketing",
    bio: "多倫多大學傳播學系二年級，負責社群媒體文案撰寫與影片製作。曾主導社團 Instagram 帳號從 200 增長到 2000 追蹤者的成長計畫。業餘喜歡寫短篇小說和電影評論。",
  },
  {
    id: "member-005",
    name: "李承恩",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=CL",
    role: "exec",
    department: "operation",
    bio: "多倫多大學經濟系四年級，負責贊助商洽談與對外合作事務。具備流利的英、中、粵語溝通能力，曾成功爭取三家本地企業成為社團年度贊助商。對金融科技創業充滿興趣。",
  },
  {
    id: "member-006",
    name: "吳佩珊",
    avatar: "https://placehold.co/200x200/1a2744/c9b99a?text=PW",
    role: "member",
    department: "operation",
    bio: "多倫多大學會計學系一年級，協助處理社團財務記錄與日常行政事務。認真負責、細心謹慎，加入社團後快速融入團隊。空閒時喜歡學鋼琴和閱讀。",
  },
];

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

/**
 * getMemberById — 依 id 查找單筆成員
 *
 * TODO: 替換為 prisma.user.findUnique({ where: { id } })
 */
export function getMemberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

/**
 * getAllMembers — 取得所有成員，依職位層級降冪排序
 *
 * TODO: 替換為 prisma.user.findMany({ orderBy: { roleLevel: 'desc' } })
 */
export function getAllMembers(): Member[] {
  const roleOrder: MemberRole[] = [
    "super_admin",
    "exec",
    "team_lead",
    "member",
  ];
  return [...MEMBERS].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  );
}

/**
 * getMembersByDepartment — 依部門篩選成員
 *
 * TODO: 替換為 prisma.user.findMany({ where: { departmentId: department } })
 */
export function getMembersByDepartment(department: MemberDepartment): Member[] {
  return MEMBERS.filter((m) => m.department === department);
}
