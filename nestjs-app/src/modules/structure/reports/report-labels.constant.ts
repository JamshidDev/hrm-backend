// Report stat label'lari — Laravel ReportService::labels() tartibi.
// GET /report/labels endpoint va generate'dagi buildStats shu ro'yxatdan foydalanadi.

export interface ReportLabel {
  key: string;
  // Erkak/Ayol sub-kalitlari (bo'lsa).
  man_woman?: [string, string];
  // Frontend'da tahrirlanadigan maydon (faqat month_created_band).
  change?: boolean;
}

export const REPORT_LABELS: ReportLabel[] = [
  { key: 'all_rate' },
  { key: 'workers_count' },
  { key: 'men' },
  { key: 'women' },
  { key: 'vacancies' },
  { key: 'part_time_contract' },
  { key: 'month_created' },
  {
    key: 'month_updated',
    man_woman: ['month_updated_men', 'month_updated_women'],
  },
  {
    key: 'month_other_created',
    man_woman: ['month_other_created_men', 'month_other_created_women'],
  },
  { key: 'month_created_30' },
  { key: 'month_created_univer' },
  { key: 'month_created_tex' },
  { key: 'month_created_other_univer' },
  { key: 'month_created_coll' },
  { key: 'month_created_school' },
  { key: 'month_created_band', change: true },
  { key: 'month_deleted' },
  {
    key: 'higher_count',
    man_woman: ['higher_men_count', 'higher_women_count'],
  },
  {
    key: 'special_count',
    man_woman: ['special_men_count', 'special_women_count'],
  },
  {
    key: 'middle_count',
    man_woman: ['middle_men_count', 'middle_women_count'],
  },
  {
    key: 'age_under_30',
    man_woman: ['age_under_30_men', 'age_under_30_women'],
  },
  { key: 'age_31_45', man_woman: ['age_31_45_men', 'age_31_45_women'] },
  {
    key: 'age_46_plus',
    man_woman: ['age_46_plus_men', 'age_46_plus_women'],
  },
  {
    key: 'pension_age_count',
    man_woman: ['pension_count_men', 'pension_count_women'],
  },
  {
    key: 'vacation_count',
    man_woman: ['vacation_count_men', 'vacation_count_women'],
  },
  {
    key: 'disability_count',
    man_woman: ['disability_men_count', 'disability_women_count'],
  },
];

// Laravel buildStats() — labels tartibida {key,value} massiv hosil qiladi.
// Har label uchun: avval man_woman sub-kalitlar, keyin asosiy key.
export function buildReportStats(
  values: Record<string, unknown>,
): Array<{ key: string; value: unknown }> {
  const stats: Array<{ key: string; value: unknown }> = [];
  for (const label of REPORT_LABELS) {
    if (label.man_woman) {
      for (const subKey of label.man_woman) {
        stats.push({ key: subKey, value: values[subKey] ?? 0 });
      }
    }
    stats.push({ key: label.key, value: values[label.key] ?? 0 });
  }
  return stats;
}
