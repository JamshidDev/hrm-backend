// Test platform tipi: module registry, scenario, comparator config.
// Yangi modul qo'shish uchun shu tiplar asosida ModuleDefinition yoziladi.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Auth turi — Sanctum admin token, Sanctum user, yoki guest (token yo'q).
export type AuthType = 'admin' | 'user' | 'guest';

// Scenario tag'lari — CLI flag'lari bilan filtrlash uchun.
// (--tag pagination → faqat pagination scenariolari).
export type ScenarioTag =
  | 'list'
  | 'detail'
  | 'create'
  | 'update'
  | 'delete'
  | 'pagination'
  | 'validation'
  | 'auth'
  | 'permission'
  | 'filter'
  | 'sorting'
  | 'soft-delete'
  | 'concurrency'
  | 'upload';

// Bitta endpoint test scenarii.
export interface Scenario {
  // Inson o'qiy oladigan nom — output'da chiqadi.
  name: string;
  // Tag(lar) — scenariolarni filtrlash uchun.
  tags: ScenarioTag[];
  // HTTP request shakli.
  request: ScenarioRequest;
  // Kutilgan status code (default: 200). 422, 404, 403 kabi.
  expectStatus?: number;
  // Faqat status'ni tekshirish (response body solishtirilmaydi). Validation testlari uchun.
  statusOnly?: boolean;
  // Bu scenariy uchun qo'shimcha ignored path'lar.
  ignorePaths?: string[];
  // Skip qilish sababi — agar scenariy hozircha ishlamasa.
  skip?: string;
}

export interface ScenarioRequest {
  method: HttpMethod;
  // URL path. ModuleDefinition.basePath bilan birlashtiriladi.
  // Misol: '/' → baseUrl, '/:id' → baseUrl/:id, '?per_page=3' → baseUrl?per_page=3
  path?: string;
  // Query string parametrlari (path ichida ham yozsa bo'ladi).
  query?: Record<string, string | number | boolean>;
  // Request body (POST/PUT/PATCH).
  body?: unknown;
  // Path parameter substitution. Misol: {id: '$fixtures.created.id'}.
  pathParams?: Record<string, string>;
  // Auth turi — module default'idan boshqacha bo'lsa.
  auth?: AuthType;
}

export interface ModuleDefinition {
  // Modul nomi — CLI'da ishlatiladi: pnpm test:parity regions.
  name: string;
  // Tag — modul guruhi: 'structure', 'admin', 'auth' va h.k. (--tag bilan filter).
  tags: string[];
  // Endpoint base path — Laravel va NestJS'da bir xil bo'lishi shart.
  basePath: string;
  // Default auth turi — alohida scenariy override qilishi mumkin.
  defaultAuth: AuthType;
  // Modul uchun standart ignored path'lar (har scenariyga qo'shiladi).
  // Misol: ['data.per_page'] — NestJS qo'shimcha key.
  ignorePaths?: string[];
  // Mask qilinadigan path'lar — har request'da o'zgaruvchi qiymatlar.
  // Misol: ['data.data[].worker.photo'] — MinIO signed URL.
  maskPaths?: string[];
  // Test scenariolari ro'yxati.
  scenarios: Scenario[];
}

// Test natijasi — bitta scenariy uchun.
export interface ScenarioResult {
  module: string;
  scenario: string;
  tags: ScenarioTag[];
  status: 'pass' | 'fail' | 'skip' | 'error';
  durationMs: number;
  reason?: string;
  diff?: DiffEntry[];
  // Status code yoki response shape farqi.
  laravelStatus?: number;
  nestjsStatus?: number;
}

export interface DiffEntry {
  // JSON path: 'data.data[0].worker.photo'.
  path: string;
  // Farq turi.
  kind: 'value' | 'type' | 'missing-laravel' | 'missing-nestjs';
  laravel: unknown;
  nestjs: unknown;
}

// Modul natijalari aggregati.
export interface ModuleResult {
  module: string;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  durationMs: number;
  scenarios: ScenarioResult[];
}

// Yakuniy natija.
export interface FinalResult {
  modulesTotal: number;
  modulesPassed: number;
  modulesFailed: number;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  testsErrored: number;
  durationMs: number;
  modules: ModuleResult[];
}

// CLI orqali kelgan options.
export interface RunOptions {
  // Bitta modul nomi (positional arg). Bo'sh bo'lsa hammasi.
  moduleName?: string;
  // Tag filter — faqat shu tag'larga ega scenariolar ishlaydi.
  tags?: ScenarioTag[];
  // Birinchi failure'da to'xtash.
  failFast: boolean;
  // To'liq diff ko'rsatish.
  verbose: boolean;
  // JSON report yozish.
  json: boolean;
  // Modullar tagida ham filter (group: structure, admin, etc.).
  moduleTag?: string;
}
