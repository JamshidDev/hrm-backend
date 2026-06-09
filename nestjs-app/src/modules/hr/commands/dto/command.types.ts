// Command request'ining ichki (nested) tuzilmalari uchun aniq tiplar.
// Laravel'dan kelgan dinamik `$data` strukturasi — class-validator bilan
// to'liq validatsiya qilinmaydi, lekin TypeScript uchun aniq shakl beramiz
// (any/unknown o'rniga). Maydonlar ixtiyoriy, chunki tur bo'yicha farq qiladi.

// Ta'til qo'shimcha sababi ({id, value}) — VacationAdditionalEnum.
export interface VacationAdditionalItem {
  id?: number | string;
  value?: number | string;
}

// Many-worker buyruqlarning har bir worker_positions elementi (41,55,61,62,71,72,73).
export interface ManyWorkerItem {
  id: number | string;
  period_from?: string;
  period_to?: string;
  from?: string;
  to?: string;
  work_day?: string;
  from_time?: string;
  to_time?: string;
  all_day?: number | string;
  additional?: VacationAdditionalItem[];
  // 61/62 (xizmat safari / o'tkazish)
  work_place_id?: number | string;
  department_id?: number | string;
  to_organization?: string;
  reason?: string;
  // 71 (mukofot)
  gift?: number | string;
  gift_type?: number | string;
  // 72 (jarima)
  fine?: number | string;
  fine_type?: number | string;
  // 73 (moddiy yordam)
  amount?: number | string;
  type?: number | string;
  // 71/72/73 — kim tomonidan (ixtiyoriy).
  by_whom?: string;
}

// Termination (33–39) qo'shimcha ma'lumotlari — CommandAdditionalTemplateHelper.
export interface PensionData {
  year?: number | string;
  count?: number | string;
}
export interface WithholdingData {
  period1?: string;
  period2?: string;
  all_day?: number | string;
  rest_day?: number | string;
  month?: number | string;
}
export interface CompensationData {
  period1?: string;
  period2?: string;
  rest_day?: number | string;
}
export interface CommandAdditional {
  pension_count?: PensionData;
  pension_coefficient?: PensionData;
  salary_withholding?: WithholdingData;
  compensation?: CompensationData;
  reason?: string;
  reasonId?: number | string;
  warning_date?: string;
  med_date?: string;
  warning_number?: number | string;
  med_number?: number | string;
  base?: string;
}
