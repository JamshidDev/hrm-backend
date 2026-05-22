// PositionHelper — Laravel app/Helpers/PositionHelper.php parity.
// Worker position uchun to'liq va qisqa lavozim nomini hisoblaydi.

// Laravel HR/DepartmentLevelEnum::CENTER = 1 (boshqaruv apparati — eng yuqori daraja).
// CENTER darajadagi bo'limda lavozim nomiga bo'lim qo'shilmaydi.
const CENTER_LEVEL = 1;

const REPLACE_FROM = [
  "bo'limi bo‘lim",
  'bo‘limi bo‘lim',
  "bo'limi bo'lim",
  'kotibiyati kotibiyat',
  'devonxona devonxona',
  'ofisi ofis',
  'filiali filial',
  'departamenti departament',
  'boshqarmasi boshqarma',
  'sexi sex',
  'deposi depo',
  'stansiyasi stansiya',
  'bekati bekat',
  'markazi markaz',
  'muassasasi muassasa',
  'uchastkasi uchastka',
];

const REPLACE_TO = [
  'bo‘limi',
  'bo‘limi',
  'bo‘limi',
  'kotibiyati',
  'devonxona',
  'ofis',
  'filiali',
  'departament',
  'boshqarmasi',
  'sexi',
  'deposi',
  'stansiyasi',
  'bekati',
  'markaz',
  'muassasasi',
  'uchastkasi',
];

function replacePositionPatterns(s: string): string {
  let out = s;
  for (let i = 0; i < REPLACE_FROM.length; i++) {
    out = out.split(REPLACE_FROM[i]).join(REPLACE_TO[i]);
  }
  return out;
}

export interface WorkerPositionShape {
  position_name: string | null;
  department_name: string | null;
  department_level: number | null;
  organization_full_name: string | null;
}

export function getFullPosition(wp: WorkerPositionShape): string {
  const positionName = wp.position_name;
  if (!positionName) return '';
  let position = positionName;
  if (wp.department_level !== CENTER_LEVEL) {
    position = `${wp.department_name ?? ''} ${position}`;
  }
  position = `${wp.organization_full_name ?? ''} ${position}`.trim();
  return replacePositionPatterns(position);
}

export function getShortPosition(wp: WorkerPositionShape): string {
  if (!wp.position_name) return '';
  let position = wp.position_name;
  if (wp.department_level !== CENTER_LEVEL) {
    position = `${wp.department_name ?? ''} ${position}`;
  }
  // ucfirst
  position = position.trim();
  if (position) {
    position = position.charAt(0).toUpperCase() + position.slice(1);
  }
  return replacePositionPatterns(position);
}
