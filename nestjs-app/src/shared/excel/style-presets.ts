// Tez-tez ishlatiladigan style preset'lar.
// Service consumer'lari shu konstanta'lardan foydalanadi, har joyda ARGB yozmasdan.
//
// Masalan: { headerStyle: HEADER_BLUE } yoki { rowStyle: (r) => r.is_total ? TOTAL_YELLOW : undefined }

import type { ExcelCellStyle } from '@/shared/excel/types';

// ============================================================
// SARLAVHA (HEADER) STYLE'LAR
// ============================================================

/** To'q ko'k fon + oq bold matn — eng ko'p ishlatiladigan sarlavha */
export const HEADER_BLUE: ExcelCellStyle = {
  bgColor: 'FF1E40AF',
  fontColor: 'FFFFFFFF',
  bold: true,
  align: 'center',
  verticalAlign: 'middle',
  border: 'thin',
  wrapText: true,
};

/** Yashil fon + oq bold matn */
export const HEADER_GREEN: ExcelCellStyle = {
  bgColor: 'FF15803D',
  fontColor: 'FFFFFFFF',
  bold: true,
  align: 'center',
  verticalAlign: 'middle',
  border: 'thin',
  wrapText: true,
};

/** Kulrang fon + qora bold matn — neytral sarlavha */
export const HEADER_GRAY: ExcelCellStyle = {
  bgColor: 'FFE5E7EB',
  fontColor: 'FF111827',
  bold: true,
  align: 'center',
  verticalAlign: 'middle',
  border: 'thin',
  wrapText: true,
};

// ============================================================
// JAMI / TOTAL QATORI STYLE'LAR
// ============================================================

/** Sariq fon + qora bold — jami qator (eng keng tarqalgan) */
export const TOTAL_YELLOW: ExcelCellStyle = {
  bgColor: 'FFFEF3C7',
  bold: true,
  border: 'medium',
};

/** Och ko'k fon + qora bold — kichik jami */
export const SUBTOTAL_BLUE: ExcelCellStyle = {
  bgColor: 'FFDBEAFE',
  bold: true,
  border: 'thin',
};

// ============================================================
// HOLAT (STATUS) STYLE'LAR
// ============================================================

/** Och yashil fon — muvaffaqiyatli holat */
export const STATUS_SUCCESS: ExcelCellStyle = {
  bgColor: 'FFD1FAE5',
  fontColor: 'FF065F46',
  bold: true,
  align: 'center',
};

/** Och qizil fon — xato/rad etilgan holat */
export const STATUS_ERROR: ExcelCellStyle = {
  bgColor: 'FFFEE2E2',
  fontColor: 'FF991B1B',
  bold: true,
  align: 'center',
};

/** Och sariq fon — kutilmoqda holati */
export const STATUS_WARNING: ExcelCellStyle = {
  bgColor: 'FFFEF3C7',
  fontColor: 'FF92400E',
  bold: true,
  align: 'center',
};

// ============================================================
// MA'LUMOT QATORI (BODY) STYLE'LAR
// ============================================================

/** Oddiy qator — border bilan */
export const BODY_DEFAULT: ExcelCellStyle = {
  border: 'thin',
  verticalAlign: 'middle',
};

/** Bo'sh / null qiymat — kulrang italic */
export const BODY_EMPTY: ExcelCellStyle = {
  fontColor: 'FF9CA3AF',
  italic: true,
  align: 'center',
};

// ============================================================
// NUMBER FORMAT preset'lar (numFmt uchun)
// ============================================================

export const FMT = {
  /** 1,234,567.89 — pul (so'm) */
  MONEY: '#,##0.00',
  /** 1,234,567 — butun pul */
  MONEY_INT: '#,##0',
  /** 1,234,567.89 so'm */
  MONEY_UZS: '#,##0.00" so\'m"',
  /** 12.34% */
  PERCENT: '0.00%',
  /** 12% */
  PERCENT_INT: '0%',
  /** 2025-01-15 */
  DATE: 'YYYY-MM-DD',
  /** 2025-01-15 14:30 */
  DATETIME: 'YYYY-MM-DD HH:mm',
  /** 14:30 */
  TIME: 'HH:mm',
  /** Telefon raqam — +998 99 501 60 04 */
  PHONE: '+###" "##" "###" "##" "##',
} as const;
