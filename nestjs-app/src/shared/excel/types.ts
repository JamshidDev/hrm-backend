// ExcelService config tiplari.
// Laravel `Maatwebsite\Excel` API'siga moslashtirilgan, lekin TypeScript-friendly.
// Ishlatish: controller yoki job ExcelService.build(config) chaqirib, Buffer oladi.

import type { Style, Workbook, Worksheet } from 'exceljs';

// ============================================================
// Style — har qanday yacheykada qo'llaniladigan vizual sozlama.
// ARGB rang formatida: 'FFRRGGBB' (alpha + RGB), masalan 'FF1E40AF' — to'q ko'k.
// ============================================================
export interface ExcelCellStyle {
  /** Fon rangi (ARGB), masalan 'FFFEF3C7' — sariq */
  bgColor?: string;
  /** Shrift rangi (ARGB), masalan 'FFFFFFFF' — oq */
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  /** Shrift o'lchami, default 11 */
  fontSize?: number;
  /** Shrift nomi, default 'Calibri' */
  fontName?: string;
  /** Gorizontal joylashish */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Vertikal joylashish */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Matn o'rashi (uzun matn uchun) */
  wrapText?: boolean;
  /** Border qalinligi (4 tomonga bir xil). Aniqroq nazorat uchun `borders` ishlat. */
  border?: 'none' | 'thin' | 'medium' | 'thick';
  /** Border rangi (ARGB), default 'FF000000' (qora) */
  borderColor?: string;
  /** Raqam formati: '#,##0.00' (pul), '0.00%' (foiz), 'YYYY-MM-DD' (sana) */
  numFmt?: string;
}

// ============================================================
// Column — sarlavha + key + width + per-column default style.
// Service `rows` arrayidagi har object'dan `key` bo'yicha qiymat oladi.
// ============================================================
export interface ExcelColumn {
  /** Sarlavha matni (1-qatorga yoziladi) */
  header: string;
  /** Row object'dagi field nomi: row[key] qiymat sifatida olinadi */
  key: string;
  /** Ustun kengligi (Excel units, default 15) */
  width?: number;
  /** Raqam formati: '#,##0.00' (pul), '0.00%' (foiz) */
  numFmt?: string;
  /** Per-column default style (rowStyle bilan birlashtiriladi) */
  style?: ExcelCellStyle;
}

// ============================================================
// Row-level conditional style — qatorga qarab style berish.
// Masalan: `total` qatori uchun sariq fon, `negative` raqam uchun qizil shrift.
// Return undefined bo'lsa, style berilmaydi.
// ============================================================
export type RowStyleFn = (
  row: Record<string, unknown>,
  index: number,
) => ExcelCellStyle | undefined;

// ============================================================
// MultiHeaderRow — ko'p qatorli sarlavha (masalan, pivot jadval).
// Default holatda `columns[].header` bittagina 1-qator sarlavha hosil qiladi.
// Agar 2+ qator sarlavha kerak bo'lsa — `headerRows` ishlat va `columns[].header`'ni bo'sh qoldir.
// ============================================================
export interface ExcelHeaderRow {
  /** Qator yacheykalarining qiymatlari */
  values: (string | number)[];
  /** Shu qatordagi merge'lar, masalan: ['A1:A2', 'D1:O1'] */
  merges?: string[];
  /** Shu qator uchun style (default: bold + ko'k fon) */
  style?: ExcelCellStyle;
  /** Qator balandligi */
  height?: number;
}

// ============================================================
// CustomizeFn — low-level ExcelJS API'ga to'g'ridan-to'g'ri kirish.
// Eng murakkab case'lar (QR drawing, custom title section, page setup) uchun.
// Service barcha standart amallarni bajargach, oxirida chaqiriladi.
// ============================================================
export type CustomizeFn = (
  worksheet: Worksheet,
  workbook: Workbook,
) => void | Promise<void>;

// ============================================================
// Sheet — bitta tab.
// ============================================================
export interface ExcelSheet {
  /** Tab nomi */
  name: string;
  /** Ustunlar (sarlavha + key + width). `headerRows` ishlatilsa, header bo'sh qoladi. */
  columns: ExcelColumn[];
  /** Ma'lumot — har object key'lar `columns[].key` bilan mos kelishi kerak */
  rows: Record<string, unknown>[];
  /**
   * Ko'p qatorli sarlavha (ixtiyoriy). Berilsa — `columns[].header` o'rniga ishlatiladi.
   * Har bir element alohida qator: values + merges + style.
   */
  headerRows?: ExcelHeaderRow[];
  /** Sarlavha qatori style (default: bold + ko'k fon + oq shrift) */
  headerStyle?: ExcelCellStyle;
  /** Per-row conditional style (jami qator, negative qiymat va h.k.) */
  rowStyle?: RowStyleFn;
  /** 1-qatorga AutoFilter dropdown qo'shish */
  autoFilter?: boolean;
  /** Sarlavhani freeze qilish (scroll qilganda yuqorida turadi) */
  freezeHeader?: boolean;
  /** Jami (footer) qator — rowStyle bilan emas, alohida boldroq style bilan */
  totalRow?: { values: Record<string, unknown>; style?: ExcelCellStyle };
  /** Merge cell ranges (data tarafi), masalan: ['A2:A5', 'D5:D10'] */
  merges?: string[];
  /** Rasmlar (logo, drawing) */
  images?: ExcelImage[];
  /**
   * Eskape-hatch: ExcelJS Worksheet/Workbook'ni xohlagancha o'zgartiring.
   * Service standart amallarini bajargandan keyin oxirida chaqiriladi.
   */
  customize?: CustomizeFn;
  /** Sheet darajasidagi qo'shimcha sozlamalar (raw ExcelJS API uchun) */
  raw?: Partial<Style>;
}

// ============================================================
// Image — sheet ustiga rasm qo'yish (logo, footer image va h.k.).
// ============================================================
export interface ExcelImage {
  /** Diskdagi fayl yo'li (yoki) buffer */
  filename?: string;
  buffer?: Buffer;
  extension: 'png' | 'jpeg' | 'gif';
  /** Joylashuv: yacheyka diapazoni ('A1:B3') yoki nuqta-asoslangan */
  range: string;
}

// ============================================================
// Workbook — to'liq fayl.
// ============================================================
export interface ExcelWorkbookConfig {
  /** Yaratgan tashkilot/foydalanuvchi (Excel metadata) */
  creator?: string;
  /** Bitta yoki bir nechta sheet */
  sheets: ExcelSheet[];
}
