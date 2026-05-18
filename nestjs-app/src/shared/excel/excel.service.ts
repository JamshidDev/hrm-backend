// ExcelService — barcha modul (controller + queue job) uchun yagona Excel generator.
//
// Ishlatish: ExcelService'ga `ExcelWorkbookConfig` (sheet'lar + columns + rows + style)
// berasiz, qaytib `Buffer` olasiz. Buffer'ni HTTP response sifatida qaytarish yoki
// MinIO/diskga saqlash mumkin.
//
// Service style/data'ni alohida tutadi — caller (consumer) faqat business mantiqqa
// e'tibor qaratadi. Style preset'lari uchun: @/shared/excel/style-presets.

import { Injectable } from '@nestjs/common';
import ExcelJS, { Workbook, Worksheet, Cell, Style } from 'exceljs';
import type {
  ExcelCellStyle,
  ExcelColumn,
  ExcelImage,
  ExcelSheet,
  ExcelWorkbookConfig,
} from '@/shared/excel/types';

@Injectable()
export class ExcelService {
  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Config asosida Excel `.xlsx` Buffer qaytaradi.
   *
   * Misol:
   * ```ts
   * const buffer = await this.excel.build({
   *   creator: 'HRM',
   *   sheets: [{
   *     name: 'Statementlar',
   *     columns: [{ header: 'PIN', key: 'pin', width: 18 }],
   *     rows: [{ pin: '31606995940026' }],
   *     headerStyle: HEADER_BLUE,
   *     autoFilter: true,
   *     freezeHeader: true,
   *   }],
   * });
   * ```
   */
  async build(config: ExcelWorkbookConfig): Promise<Buffer> {
    const wb = await this.createWorkbook(config);
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /**
   * Excel'ni to'g'ridan-to'g'ri faylga yozadi (queue job uchun qulay).
   */
  async buildToFile(
    config: ExcelWorkbookConfig,
    filePath: string,
  ): Promise<void> {
    const wb = await this.createWorkbook(config);
    await wb.xlsx.writeFile(filePath);
  }

  /**
   * Excel'ni HTTP response stream'iga yozadi (controller download uchun).
   *
   * Caller alohida header'larni qo'yishi kerak:
   * ```ts
   * res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   * res.setHeader('Content-Disposition', `attachment; filename="${name}.xlsx"`);
   * await this.excel.buildToStream(config, res);
   * ```
   */
  async buildToStream(
    config: ExcelWorkbookConfig,
    // ExcelJS `xlsx.write` Node's `stream.Stream` ni kutadi (`pipe`, `compose` bilan).
    // Express `Response` shu interface'ga mos keladi, lekin TypeScript bir vaqtning
    // o'zida buni ko'rmaydi — `as Stream` orqali yumshatamiz.
    stream: NodeJS.WritableStream,
  ): Promise<void> {
    const wb = await this.createWorkbook(config);
    // ExcelJS Stream tipi Node's `WritableStream`'dan kengroq (pipe/compose);
    // Express Response runtime'da mos, ammo TypeScript ko'rmaydi.

    await wb.xlsx.write(
      stream as unknown as Parameters<typeof wb.xlsx.write>[0],
    );
  }

  // ============================================================
  // READ API — `.xlsx` parsing (upload job'lar uchun)
  // ============================================================

  /**
   * Excel buffer'idan barcha qatorlarni 2D array sifatida o'qib qaytaradi.
   * Birinchi sheet ishlatiladi (Laravel `Excel::toCollection(sheet=0)` parity).
   *
   * @param buffer  .xlsx fayl content'i
   * @param skipRows  yuqoridan necha qatorni o'tkazib yuborish (header rows)
   * @returns 2D array: rows[row_index][col_index] = qiymat
   */
  async readBuffer(
    buffer: Buffer,
    skipRows = 0,
  ): Promise<Array<Array<unknown>>> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    const rows: Array<Array<unknown>> = [];
    let rowIdx = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      rowIdx++;
      if (rowIdx <= skipRows) return;
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      // ExcelJS row.values [0] index bo'sh — slice(1) bilan kesamiz.
      rows.push(values);
    });
    return rows;
  }

  /**
   * Excel'dagi xom qiymatni double'ga aylantirish (Laravel `normalize` pattern):
   *   - null/undefined → 0
   *   - bo'sh string → 0
   *   - bo'sh joy, vergul → almashtirilgan, parseFloat
   *   - `-` belgisi → 0 (Laravel-style strip)
   */
  static toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    // ExcelJS ba'zan formula natijasini object sifatida qaytaradi: { result: number }
    if (typeof value === 'object' && value !== null && 'result' in value) {
      return ExcelService.toNumber(value.result);
    }
    // Faqat primitive matn/boolean — `String()` xavfsiz; objectlar `[object Object]`
    // bermasin (yaxshi: 0 qaytaramiz).
    if (typeof value !== 'string' && typeof value !== 'boolean') return 0;
    let s = String(value).trim();
    s = s
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    if (!s || s === '-' || s === '.') return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  /** Excel'dagi xom matnni tozalash — trim, NBSP/spaces. */
  static toText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value !== null) {
      // ExcelJS: formula → `{ result }`, rich text → `{ text }`.
      if ('result' in value) {
        return ExcelService.toText(value.result);
      }
      if ('text' in value) {
        return ExcelService.toText(value.text);
      }
      // Boshqa object shape — bo'sh string (`[object Object]` qaytarmaymiz).
      return '';
    }
    // Primitive (string/number/boolean) — String() xavfsiz.
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      return '';
    }
    return String(value)
      .replace(/\u00A0/g, ' ')
      .trim();
  }

  /**
   * PIN'ni Excel'dan o'qib raqamga aylantirish — apostrof, bo'sh joy strip.
   * Faqat raqamlardan iborat bo'lishi kerak; aks holda null qaytaradi.
   */
  static toPin(value: unknown): number | null {
    const s = ExcelService.toText(value).replace(/[\s']/g, '');
    if (!s || !/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // ============================================================
  // WORKBOOK BUILDER (privat)
  // ============================================================

  private async createWorkbook(config: ExcelWorkbookConfig): Promise<Workbook> {
    const wb = new ExcelJS.Workbook();
    wb.creator = config.creator ?? 'HRM Backend';
    wb.created = new Date();

    for (const sheetCfg of config.sheets) {
      await this.buildSheet(wb, sheetCfg);
    }

    return wb;
  }

  private async buildSheet(wb: Workbook, cfg: ExcelSheet): Promise<Worksheet> {
    // `headerRows` (multi-row) ishlatilgan bo'lsa, freeze pane qatorlari sonini hisoblaymiz.
    const headerRowsCount = cfg.headerRows?.length ?? 1;
    const ws = wb.addWorksheet(cfg.name, {
      views: cfg.freezeHeader
        ? [{ state: 'frozen', ySplit: headerRowsCount }]
        : undefined,
    });

    // 1. Ustun sarlavhalari + key + width
    // `headerRows` berilgan bo'lsa, ustun header'lari (1-qator yacheykasi)
    // multi-row tarafidan qo'lda yoziladi — bu yerda faqat key+width keting.
    if (cfg.headerRows) {
      ws.columns = cfg.columns.map((col) => ({
        key: col.key,
        width: col.width ?? 15,
      }));
      // Multi-row sarlavhalarni yozish
      this.writeHeaderRows(ws, cfg.headerRows, cfg);
    } else {
      ws.columns = cfg.columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width ?? 15,
      }));
      // Standard 1-qator sarlavha uchun style
      const headerStyle = cfg.headerStyle ?? this.defaultHeaderStyle();
      ws.getRow(1).eachCell((cell) => {
        this.applyCellStyle(cell, headerStyle);
      });
      ws.getRow(1).height = 24;
    }

    // 2. Ma'lumot qatorlarini qo'shish
    let rowIdx = headerRowsCount + 1;
    for (const row of cfg.rows) {
      const addedRow = ws.addRow(row);
      this.applyColumnNumFmt(addedRow, cfg.columns);

      // Per-row conditional style
      if (cfg.rowStyle) {
        const rowStyle = cfg.rowStyle(row, rowIdx - headerRowsCount - 1);
        if (rowStyle) {
          addedRow.eachCell((cell) => this.applyCellStyle(cell, rowStyle));
        }
      }
      rowIdx++;
    }

    // 3. Jami (footer) qatori
    if (cfg.totalRow) {
      const total = ws.addRow(cfg.totalRow.values);
      this.applyColumnNumFmt(total, cfg.columns);
      const totalStyle = cfg.totalRow.style ?? this.defaultTotalStyle();
      total.eachCell((cell) => this.applyCellStyle(cell, totalStyle));
    }

    // 4. AutoFilter (sarlavha qatoriga dropdown)
    if (cfg.autoFilter && cfg.columns.length > 0) {
      const lastCol = this.colLetter(cfg.columns.length);
      const filterRow = headerRowsCount; // multi-row bo'lsa, oxirgi header qatoriga qo'yamiz
      ws.autoFilter = {
        from: `A${filterRow}`,
        to: `${lastCol}${filterRow}`,
      };
    }

    // 5. Merge cells (data tarafi)
    if (cfg.merges) {
      for (const range of cfg.merges) {
        ws.mergeCells(range);
      }
    }

    // 6. Rasmlar (logo va h.k.)
    if (cfg.images) {
      for (const img of cfg.images) {
        this.addImage(wb, ws, img);
      }
    }

    // 7. Customize hook — eng oxirida, foydalanuvchi xohlagan o'zgartirishni qila oladi.
    if (cfg.customize) {
      await cfg.customize(ws, wb);
    }

    return ws;
  }

  /**
   * Multi-row sarlavhalarni yozadi va merge'larni qo'llaydi.
   * Har bir qator alohida style oladi (default: bold + ko'k fon).
   */
  private writeHeaderRows(
    ws: Worksheet,
    headerRows: NonNullable<ExcelSheet['headerRows']>,
    cfg: ExcelSheet,
  ): void {
    const defaultStyle = cfg.headerStyle ?? this.defaultHeaderStyle();

    headerRows.forEach((hr, idx) => {
      const rowNumber = idx + 1;
      const row = ws.getRow(rowNumber);
      hr.values.forEach((value, colIdx) => {
        row.getCell(colIdx + 1).value = value;
      });
      const style = hr.style ?? defaultStyle;
      row.eachCell((cell) => this.applyCellStyle(cell, style));
      row.height = hr.height ?? 24;
      row.commit();

      // Shu qator uchun merge'lar (masalan 'A1:A2' — vertikal)
      if (hr.merges) {
        for (const range of hr.merges) {
          ws.mergeCells(range);
        }
      }
    });
  }

  // ============================================================
  // STYLE QO'LLASH (privat)
  // ============================================================

  /**
   * `ExcelCellStyle` (bizning sodda format) → ExcelJS Cell.style ga aylantirib qo'llash.
   */
  private applyCellStyle(cell: Cell, style: ExcelCellStyle): void {
    if (style.bgColor) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: style.bgColor },
      };
    }

    const fontParts: Partial<Style['font']> = {};
    if (style.bold) fontParts.bold = true;
    if (style.italic) fontParts.italic = true;
    if (style.fontSize) fontParts.size = style.fontSize;
    if (style.fontName) fontParts.name = style.fontName;
    if (style.fontColor) fontParts.color = { argb: style.fontColor };
    if (Object.keys(fontParts).length > 0) {
      cell.font = { ...cell.font, ...fontParts };
    }

    if (style.align || style.verticalAlign || style.wrapText !== undefined) {
      cell.alignment = {
        ...cell.alignment,
        horizontal: style.align,
        vertical: style.verticalAlign,
        wrapText: style.wrapText,
      };
    }

    if (style.border && style.border !== 'none') {
      const color = { argb: style.borderColor ?? 'FF000000' };
      const side = { style: style.border, color };
      cell.border = {
        top: side,
        left: side,
        bottom: side,
        right: side,
      };
    }

    if (style.numFmt) {
      cell.numFmt = style.numFmt;
    }
  }

  /**
   * Har bir ustun uchun `numFmt` belgilangan bo'lsa, qator yacheykalariga tatbiq qiladi.
   * Masalan: `salary` ustuni uchun `#,##0.00` → barcha row'larda pul formatida ko'rinadi.
   */
  private applyColumnNumFmt(row: ExcelJS.Row, columns: ExcelColumn[]): void {
    columns.forEach((col, idx) => {
      const fmt = col.numFmt ?? col.style?.numFmt;
      if (fmt) {
        row.getCell(idx + 1).numFmt = fmt;
      }
      if (col.style) {
        this.applyCellStyle(row.getCell(idx + 1), {
          ...col.style,
          // numFmt'ni bo'sh qoldiramiz, yuqorida o'zi qo'yildi
          numFmt: undefined,
        });
      }
    });
  }

  // ============================================================
  // DEFAULT STYLE'LAR
  // ============================================================

  private defaultHeaderStyle(): ExcelCellStyle {
    return {
      bgColor: 'FF1E40AF',
      fontColor: 'FFFFFFFF',
      bold: true,
      align: 'center',
      verticalAlign: 'middle',
      border: 'thin',
      wrapText: true,
    };
  }

  private defaultTotalStyle(): ExcelCellStyle {
    return {
      bgColor: 'FFFEF3C7',
      bold: true,
      border: 'medium',
    };
  }

  // ============================================================
  // YORDAMCHILAR
  // ============================================================

  /**
   * Ustun raqami → Excel ustun harfi.
   * 1 → 'A', 2 → 'B', ..., 27 → 'AA', 28 → 'AB'
   */
  private colLetter(n: number): string {
    let result = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }

  private addImage(wb: Workbook, ws: Worksheet, img: ExcelImage): void {
    // exceljs `addImage.buffer` qattiq `Buffer<ArrayBuffer>` kutadi; Node'ning
    // umumiy `Buffer<ArrayBufferLike>` bilan mos kelmaydi — `as ArrayBuffer`
    // orqali to'g'rilaymiz (runtime'da ikkalasi ham bir xil byte tepa).
    const id: number = img.buffer
      ? wb.addImage({
          buffer: img.buffer as unknown as ArrayBuffer,
          extension: img.extension,
        })
      : wb.addImage({ filename: img.filename!, extension: img.extension });
    ws.addImage(id, img.range);
  }
}
