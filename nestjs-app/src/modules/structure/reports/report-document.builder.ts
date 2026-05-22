// Report DOCX hujjat builder — store() generateDocument porti.
// Laravel: ReportService::generateDocument + PhpWord TemplateProcessor.
//
// public/resumes/report/report.docx shabloni:
//   ${block}...${/block}            — har tashkilot uchun stat blok (cloneBlock).
//   ${contractsBlock}...${/...}     — kontraktlar jadvali bloki (cloneBlock).
//   ${organization} qatori          — har kontrakt uchun jadval qatori (cloneRow).
//   ${year} ${month} ${director}... — skalar placeholderlar (setValue).
//
// PhpWord TemplateProcessor JS'da yo'q — minimal port: PizZip + XML manipulyatsiya.
// Placeholder'lar Word run'larga bo'linadi — normalizePlaceholders bilan tiklanadi.

import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';

// ============================================================
// TIPLAR
// ============================================================

export interface ReportDocDetail {
  data: {
    organization_name?: string | null;
    stats?: Array<{ key: string; value: unknown }>;
    contracts?: Array<Record<string, unknown>>;
  } | null;
}

export interface ReportDocParams {
  details: ReportDocDetail[];
  year: number | null;
  month: number | null;
  userOrganizationName: string;
  directorPosition: string;
  directorName: string;
}

// Laravel Helper::getMonth — o'zbekcha oy nomlari.
const UZ_MONTHS: Record<number, string> = {
  1: 'yanvar',
  2: 'fevral',
  3: 'mart',
  4: 'aprel',
  5: 'may',
  6: 'iyun',
  7: 'iyul',
  8: 'avgust',
  9: 'sentyabr',
  10: 'oktyabr',
  11: 'noyabr',
  12: 'dekabr',
};

// ============================================================
// PUBLIC — DOCX buffer hosil qilish
// ============================================================

export async function buildReportDocx(
  params: ReportDocParams,
): Promise<Buffer> {
  const templatePath = join(
    process.cwd(),
    'public',
    'resumes',
    'report',
    'report.docx',
  );
  const templateBuffer = await readFile(templatePath);
  const tpl = new DocxTemplate(templateBuffer);

  // blocks — har detail uchun stat map; contracts — barcha kontraktlar.
  const blocks: Record<string, string>[] = [];
  const contracts: Record<string, unknown>[] = [];
  for (const detail of params.details) {
    blocks.push(detailDocumentStats(detail.data));
    const dc = detail.data?.contracts;
    if (Array.isArray(dc) && dc.length > 0) {
      for (const c of dc) contracts.push(c);
    }
  }

  // ${block} — har tashkilot bloki.
  if (blocks.length > 0) {
    tpl.cloneBlock('block', blocks.length, blocks);
  } else {
    tpl.cloneBlock('block', 0);
  }

  // ${contractsBlock} — kontraktlar jadvali bloki + qatorlar.
  if (contracts.length > 0) {
    tpl.cloneBlock('contractsBlock', 1);
    tpl.cloneRowAndSetValues('organization', contracts);
  } else {
    tpl.cloneBlock('contractsBlock', 0);
  }

  // Skalar placeholderlar.
  const monthName = params.month ? (UZ_MONTHS[params.month] ?? '') : '';
  tpl.setValue('user_organization', params.userOrganizationName);
  tpl.setValue('year', params.year != null ? String(params.year) : '');
  tpl.setValue('month', monthName.toUpperCase());
  tpl.setValue('director_position', params.directorPosition);
  tpl.setValue('director', params.directorName);

  return tpl.getBuffer();
}

// Laravel detailDocumentStats — stats'ni {key: value} map'ga aylantiradi.
// (float)value 0 yoki NaN bo'lsa bo'sh string ko'rsatiladi.
function detailDocumentStats(
  data: ReportDocDetail['data'],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of data?.stats ?? []) {
    if (!s || typeof s.key !== 'string') continue;
    const f = parseFloat(String(s.value));
    out[s.key] = f ? String(s.value) : '';
  }
  out.organization_name = data?.organization_name ?? '';
  return out;
}

// ============================================================
// DocxTemplate — minimal PhpWord TemplateProcessor porti
// ============================================================

class DocxTemplate {
  private readonly zip: PizZip;
  private xml: string;

  constructor(buffer: Buffer) {
    this.zip = new PizZip(buffer);
    const file = this.zip.file('word/document.xml');
    if (!file) {
      throw new Error('report.docx: word/document.xml topilmadi');
    }
    this.xml = normalizePlaceholders(file.asText());
  }

  // ${name} → value (barcha takrorlar).
  setValue(name: string, value: string): void {
    this.xml = this.xml.split('${' + name + '}').join(escapeXml(value));
  }

  // ${name}...${/name} blokini klonlaydi. Marker paragraflari olib tashlanadi.
  //  - variableReplacements berilsa: har klon uchun ${key} → qiymat.
  //  - aks holda: blok count marta nusxalanadi (count=0 → blok o'chiriladi).
  cloneBlock(
    name: string,
    count: number,
    variableReplacements?: Record<string, string>[],
  ): void {
    const openIdx = this.xml.indexOf('${' + name + '}');
    const closeIdx = this.xml.indexOf('${/' + name + '}');
    if (openIdx < 0 || closeIdx < 0 || closeIdx < openIdx) return;

    const openP = findParagraph(this.xml, openIdx);
    const closeP = findParagraph(this.xml, closeIdx);
    if (openP.start < 0 || closeP.start < 0) return;

    const content = this.xml.slice(openP.end, closeP.start);

    let clones: string[];
    if (variableReplacements) {
      clones = variableReplacements.map((repl) => {
        let block = content;
        for (const [k, v] of Object.entries(repl)) {
          block = block.split('${' + k + '}').join(escapeXml(v));
        }
        return block;
      });
    } else {
      clones = [];
      for (let i = 0; i < count; i++) clones.push(content);
    }

    this.xml =
      this.xml.slice(0, openP.start) +
      clones.join('') +
      this.xml.slice(closeP.end);
  }

  // ${search} bo'lgan jadval qatorini har value uchun klonlaydi.
  // Laravel cloneRowAndSetValues: ${key} → ${key#N} → qiymat.
  cloneRowAndSetValues(
    search: string,
    values: Record<string, unknown>[],
  ): void {
    const idx = this.xml.indexOf('${' + search + '}');
    if (idx < 0) return;

    const trSpace = this.xml.lastIndexOf('<w:tr ', idx);
    const trAngle = this.xml.lastIndexOf('<w:tr>', idx);
    const rowStart = Math.max(trSpace, trAngle);
    if (rowStart < 0) return;
    const trEnd = this.xml.indexOf('</w:tr>', idx);
    if (trEnd < 0) return;
    const rowEnd = trEnd + '</w:tr>'.length;
    const rowXml = this.xml.slice(rowStart, rowEnd);

    const clones = values.map((rowData, i) => {
      const n = i + 1;
      // ${key} → ${key#N}.
      let row = rowXml.replace(
        /\$\{([^}]+?)\}/g,
        (_full: string, key: string) => '${' + key + '#' + n + '}',
      );
      for (const [k, v] of Object.entries(rowData)) {
        row = row.split('${' + k + '#' + n + '}').join(escapeXml(toStr(v)));
      }
      return row;
    });

    this.xml =
      this.xml.slice(0, rowStart) + clones.join('') + this.xml.slice(rowEnd);
  }

  getBuffer(): Buffer {
    this.zip.file('word/document.xml', this.xml);
    return this.zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}

// ============================================================
// HELPER'LAR
// ============================================================

// Marker indeksini o'rab turgan <w:p>...</w:p> chegaralarini topadi.
// `<w:p ` / `<w:p>` — `<w:pPr>` bilan adashmaslik uchun aniq qidiriladi.
function findParagraph(
  xml: string,
  markerIdx: number,
): { start: number; end: number } {
  const pSpace = xml.lastIndexOf('<w:p ', markerIdx);
  const pAngle = xml.lastIndexOf('<w:p>', markerIdx);
  const start = Math.max(pSpace, pAngle);
  const endTag = xml.indexOf('</w:p>', markerIdx);
  const end = endTag < 0 ? -1 : endTag + '</w:p>'.length;
  return { start, end: start < 0 || endTag < 0 ? -1 : end };
}

// ${name} / ${/name} placeholderlar Word run'larga bo'lingan — bittaga normalize.
function normalizePlaceholders(xml: string): string {
  const tagRe = /<w:t(\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const matches: Array<{
    start: number;
    end: number;
    text: string;
    attrs: string;
  }> = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      text: m[2],
      attrs: m[1] ?? '',
    });
  }
  if (matches.length === 0) return xml;

  const fullText = matches.map((mm) => mm.text).join('');
  const offsets: number[] = [];
  let cursor = 0;
  for (const mm of matches) {
    offsets.push(cursor);
    cursor += mm.text.length;
  }
  const findMatchFor = (textIdx: number): number => {
    let lo = 0;
    let hi = matches.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] <= textIdx) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  };

  // ${name} yoki ${/name}.
  const phRe = /\$\{\/?[a-zA-Z_][a-zA-Z0-9_]*\}/g;
  const merges: Array<{ first: number; last: number; merged: string }> = [];
  let pm: RegExpExecArray | null;
  while ((pm = phRe.exec(fullText)) !== null) {
    const startIdx = pm.index;
    const endIdx = pm.index + pm[0].length - 1;
    const firstMatch = findMatchFor(startIdx);
    const lastMatch = findMatchFor(endIdx);
    if (firstMatch === lastMatch) continue;
    const firstWtStart = offsets[firstMatch];
    const lastWtStart = offsets[lastMatch];
    const preFirst = matches[firstMatch].text.slice(0, startIdx - firstWtStart);
    const postLast = matches[lastMatch].text.slice(endIdx + 1 - lastWtStart);
    const middleText = fullText.slice(startIdx, endIdx + 1);
    merges.push({
      first: firstMatch,
      last: lastMatch,
      merged: preFirst + middleText + postLast,
    });
    phRe.lastIndex = endIdx + 1;
  }
  if (merges.length === 0) return xml;

  let result = xml;
  for (let i = merges.length - 1; i >= 0; i--) {
    const { first, last, merged } = merges[i];
    const firstMatch = matches[first];
    const attrs = firstMatch.attrs.includes('xml:space')
      ? firstMatch.attrs
      : `${firstMatch.attrs} xml:space="preserve"`;
    const newFirst = `<w:t${attrs}>${merged}</w:t>`;
    for (let j = last; j > first; j--) {
      const mm = matches[j];
      result =
        result.slice(0, mm.start) +
        `<w:t${mm.attrs}></w:t>` +
        result.slice(mm.end);
    }
    result =
      result.slice(0, firstMatch.start) +
      newFirst +
      result.slice(firstMatch.end);
  }
  return result;
}

// Noma'lum qiymatni xavfsiz string'ga aylantiradi (object → bo'sh).
function toStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
