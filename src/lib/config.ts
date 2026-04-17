/**
 * config.ts — 全局設定載入器
 *
 * 負責讀取 config.yaml，將 ${ENV_VAR} 佔位符替換為對應的環境變數，
 * 並提供強型別的 getConfig() 函數供整個應用使用。
 *
 * 用法：
 *   import { getConfig } from "@/lib/config";
 *   const config = getConfig();
 *   console.log(config.club.name); // "ROCSAUT"
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// ─────────────────────────────────────────────
// TypeScript 型別定義
// ─────────────────────────────────────────────

/** 社群媒體連結 */
export interface SocialLinks {
  instagram: string;
  facebook: string;
  linkedin: string;
}

/** 地理座標 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** 地點資訊 */
export interface Location {
  address: string;
  city: string;
  province: string;
  country: string;
  coordinates: Coordinates;
}

/** 社團基本資訊 */
export interface ClubConfig {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  founded_year: number;
  logo: string;
  contact_email: string;
  social: SocialLinks;
  location: Location;
}

/** 主題色彩與字體設定 */
export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  font_sans: string;
  font_display: string;
}

/** 部門定義（對應 config.yaml teams[] — yaml key 仍為 teams，TypeScript 型別改名） */
export interface DepartmentConfig {
  id: string;
  name: string;
  description: string;
}

/** 角色定義（含權限等級） */
export interface RoleConfig {
  id: string;
  label: string;
  level: number;
}

/** 贊助商等級定義 */
export interface SponsorTierConfig {
  id: string;
  label: string;
  order: number;
}

/** 資料庫設定 */
export interface DatabaseConfig {
  provider: string;
  url: string;
}

/** 物件儲存設定 */
export interface StorageConfig {
  provider: string;
  url: string;
}

/** 身分驗證設定 */
export interface AuthConfig {
  provider: string;
  google_client_id: string;
  google_client_secret: string;
  nextauth_secret: string;
  nextauth_url: string;
  allowed_email_domains: string[];
}

/** Email 發送設定 */
export interface EmailConfig {
  provider: string;
  from: string;
  api_key: string;
}

/** 基礎設施設定（資料庫、儲存、驗證、部署、Email） */
export interface InfrastructureConfig {
  database: DatabaseConfig;
  storage: StorageConfig;
  auth: AuthConfig;
  deployment: { provider: string };
  email: EmailConfig;
}

/** 本地 AI 執行器設定（Ollama） */
export interface LocalAIConfig {
  provider: string;
  base_url: string;
  default_model: string;
  code_model: string;
}

/** Kaggle 執行器設定 */
export interface KaggleConfig {
  api_key: string;
  username: string;
}

/** Google Colab 執行器設定 */
export interface ColabConfig {
  endpoint: string;
}

/** 所有 AI 執行器設定 */
export interface ExecutorsConfig {
  local_ai: LocalAIConfig;
  kaggle: KaggleConfig;
  colab: ColabConfig;
}

/** 單一模組的啟用設定 */
export interface ModuleConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/** 商城模組（Shopify）設定 */
export interface MerchModuleConfig extends ModuleConfig {
  provider: string;
  storefront_token: string;
  store_domain: string;
}

/** 所有功能模組的開關設定 */
export interface ModulesConfig {
  sponsors: ModuleConfig;
  alumni: ModuleConfig;
  finance: ModuleConfig;
  merch: MerchModuleConfig;
  analytics: ModuleConfig;
  multi_club: ModuleConfig;
}

/** 活動報名設定 */
export interface RegistrationConfig {
  reminder_hours_before: number;
}

/** 多租戶設定（未來擴充用） */
export interface MultiTenantConfig {
  isolation: string;
  super_admin_email: string;
}

/** 完整設定型別（對應 config.yaml 根層級） */
export interface AppConfig {
  club: ClubConfig;
  theme: ThemeConfig;
  teams: DepartmentConfig[];
  roles: RoleConfig[];
  sponsor_tiers: SponsorTierConfig[];
  infrastructure: InfrastructureConfig;
  executors: ExecutorsConfig;
  modules: ModulesConfig;
  registration: RegistrationConfig;
  multi_tenant: MultiTenantConfig;
}

// ─────────────────────────────────────────────
// 環境變數替換邏輯
// ─────────────────────────────────────────────

/**
 * 遞迴遍歷 YAML 解析結果，將所有 "${ENV_VAR}" 格式的字串
 * 替換為對應的 process.env 環境變數值。
 * 若環境變數未設定，保留原始佔位符字串（不拋錯，方便開發時診斷）。
 */
function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    // 匹配 ${VAR_NAME} 格式，支援一個字串中出現多個佔位符
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
      return process.env[varName] ?? `\${${varName}}`;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveEnvVars(v),
      ])
    );
  }
  return obj;
}

// ─────────────────────────────────────────────
// 單例快取，避免重複讀取檔案
// ─────────────────────────────────────────────

let cachedConfig: AppConfig | null = null;

/**
 * 讀取並回傳全局應用設定。
 *
 * - 第一次呼叫時從 config.yaml 讀取並解析。
 * - 後續呼叫直接回傳快取，效能友好。
 * - 環境變數佔位符（${ENV_VAR}）會自動替換為實際值。
 *
 * @returns 強型別的 AppConfig 物件
 * @throws 若 config.yaml 不存在或格式錯誤時拋出錯誤
 */
export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  // config.yaml 位於專案根目錄
  const configPath = path.join(process.cwd(), "config.yaml");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `[config] 找不到設定檔：${configPath}\n請確認 config.yaml 存在於專案根目錄。`
    );
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("[config] config.yaml 格式錯誤：根層級必須為物件。");
  }

  // 替換環境變數後轉型為 AppConfig
  cachedConfig = resolveEnvVars(parsed) as AppConfig;
  return cachedConfig;
}
