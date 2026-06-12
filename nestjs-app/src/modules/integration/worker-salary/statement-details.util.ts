// Statement detail quruvchi — Laravel StatementDetailService::buildDetails +
// StatementService::extractData + number_format. Integration salary va mobile salary
// (UserMobileService::salary) ikkalasi shu yerdan foydalanadi.

import { STATEMENT_CODE_NAMES } from '@/modules/integration/worker-salary/statement-codes';

export interface ExtractItem {
  code: string;
  type: string;
  amount: string;
}

// Laravel number_format($n, 2, ',', ' ') — 2 kasr, ',' kasr ajratgich, ' ' minglik.
export function numberFormat(n: number): string {
  const neg = n < 0;
  const rounded = Math.round(Math.abs(n) * 100 + 1e-9) / 100;
  const fixed = rounded.toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + grouped + ',' + dec;
}

function codeLabel(code: string, lang: string): string {
  const dict = STATEMENT_CODE_NAMES[lang] ?? STATEMENT_CODE_NAMES.uz;
  return dict[code] ?? code;
}

// Laravel StatementService::extractData — s_NNN (from..to) non-zero kolonkalar.
function extractData(
  stmt: Record<string, unknown>,
  from: number,
  to: number,
  lang: string,
): { items: ExtractItem[]; total: string } {
  const items: ExtractItem[] = [];
  let sum = 0;
  for (let i = from; i <= to; i++) {
    const code = String(i).padStart(3, '0');
    const value = stmt[`s_${code}`];
    // Laravel: isset && !== 0.0 → null/undefined yoki 0 o'tkazib yuboriladi.
    if (typeof value === 'number' && value !== 0) {
      sum += value;
      items.push({
        code,
        type: codeLabel(code, lang),
        amount: numberFormat(value),
      });
    }
  }
  return { items, total: numberFormat(sum) };
}

// Laravel StatementDetailService::buildDetails (bitta statement uchun).
export function buildStatementDetail(
  stmt: Record<string, unknown>,
  orgFull: string | null,
  orgName: string | null,
  lang: string,
) {
  const inBlock = extractData(stmt, 1, 600, lang);
  const outBlock = extractData(stmt, 856, 999, lang);
  return {
    worker: {
      full_name: stmt.full_name as string | null,
      pin: stmt.pin as number | null,
      position: stmt.position as string | null,
      main_salary: stmt.main_salary as number,
      work_time: stmt.work_time as number,
      year: stmt.year as number,
      month: stmt.month as number,
      organization: `${orgFull ?? ''} (${orgName ?? ''})`,
    },
    in: inBlock.items,
    in_total: inBlock.total,
    out: outBlock.items,
    out_total: outBlock.total,
    in_card: {
      code: codeLabel('885', lang),
      amount: stmt.s_885 as number,
    },
  };
}
