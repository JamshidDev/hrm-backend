// HR Dashboard Views — sof (pure) yordamchi funksiyalar.
// Sana hisoblari va lavozim nomi qurish — DB/context'siz.

import { RELATIVE_LABELS } from '@/modules/hr/dashboard-views/dashboard-views.constants';

// `YYYY-MM-DD` formatga keltirish (lokal sana).
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// Bugungi sana `YYYY-MM-DD`.
export function todayDate(): string {
  return fmt(new Date());
}

// Keyingi oydagi shu kun `YYYY-MM-DD`.
export function nextMonthDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return fmt(d);
}

// Berilgan yil+oy uchun oy boshlanishi va oxiri (`YYYY-MM-DD`).
export function monthBounds(
  year: number,
  month: number,
): { from: string; to: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

// Tug'ilgan sanadan yoshni hisoblash (Laravel WorkerInfoResource `age`).
export function calcAge(birthday: string | null): number {
  if (!birthday) return 0;
  return Math.abs(
    Math.floor(
      (Date.now() - new Date(birthday).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25),
    ),
  );
}

// Laravel PositionHelper::replace — birlashtirilgan dept+pos nomlarda dublikat
// so'zlarni qisqartiradi ("bo'limi bo'lim boshlig'i" → "bo'limi boshlig'i").
const POSITION_REPLACEMENTS: Array<[string | RegExp, string]> = [
  [/bo['‘]limi bo['‘]lim/g, 'bo‘limi'],
  ['kotibiyati kotibiyat', 'kotibiyati'],
  ['devonxona devonxona', 'devonxona'],
  ['ofisi ofis', 'ofis'],
  ['filiali filial', 'filiali'],
  ['departamenti departament', 'departament'],
  ['boshqarmasi boshqarma', 'boshqarmasi'],
  ['sexi sex', 'sexi'],
  ['deposi depo', 'deposi'],
  ['stansiyasi stansiya', 'stansiyasi'],
  ['bekati bekat', 'bekati'],
  ['markazi markaz', 'markaz'],
  ['muassasasi muassasa', 'muassasasi'],
  ['uchastkasi uchastka', 'uchastkasi'],
];

function applyPositionReplacements(s: string): string {
  let out = s;
  for (const [from, to] of POSITION_REPLACEMENTS) {
    out =
      typeof from === 'string'
        ? out.split(from).join(to)
        : out.replace(from, to);
  }
  return out;
}

// Laravel PositionHelper::getShortPosition — (dept.name agar level!=1) + pos.name, ucfirst.
export function buildShortPosition(
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  let position = posName;
  if (deptLevel !== 1 && deptName) position = `${deptName} ${position}`;
  position = position.trim();
  position = position.charAt(0).toUpperCase() + position.slice(1);
  return applyPositionReplacements(position);
}

// Laravel PositionHelper::getFullPosition — org.full_name + (dept.name agar level!=1) + pos.name.
export function buildFullPosition(
  orgFullName: string | null,
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  let position = posName;
  if (deptLevel !== 1 && deptName) position = `${deptName} ${position}`;
  return `${orgFullName ?? ''} ${position}`.trim();
}

// RelativeEnum::get — qarindoshlik turi label (topilmasa bo'sh satr).
export function relativeLabel(v: number): string {
  return RELATIVE_LABELS[v] ?? '';
}
