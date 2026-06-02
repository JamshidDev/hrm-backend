// WorkerCategoryResource parity. Laravel: Economist/Transformers/Statement/WorkerCategoryResource.
//   counts → number_format(v)        — vergul ming ajratgich, 0 kasr
//   salary → number_format(v,2,'.',' ') — bo'sh joy ming, '.' kasr, 2 raqam
//   result_worker_count / result_salary_fund — 10 kategoriya yig'indisi
//   (temporary_contract / civil_contract / freelancer KIRMAYDI).
//   organization_id / created_at / updated_at / deleted_at — chiqmaydi.

import type { worker_categories } from '@/db/schema';

type Row = typeof worker_categories.$inferSelect;

// PHP number_format ekvivalenti. Intl en-US default rounding = halfExpand (PHP'dek).
function nf(value: unknown, decimals: number, thousandsSep: ',' | ' '): string {
  const n = Number(value) || 0;
  const s = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  // en-US: ',' ming, '.' kasr. Kerakli ming ajratgichga almashtiramiz.
  return thousandsSep === ',' ? s : s.replace(/,/g, thousandsSep);
}

const cnt = (v: unknown): string => nf(v, 0, ','); // number_format(v)
const sal = (v: unknown): string => nf(v, 2, ' '); // number_format(v, 2, '.', ' ')

// result_* uchun 10 kategoriya (worker_count / salary_fund).
const RESULT_WORKER_FIELDS = [
  'external_worker_count',
  'capital_society_worker_count',
  'capital_own_use_worker_count',
  'capital_foreign_company_worker_count',
  'construction_society_worker_count',
  'construction_own_use_worker_count',
  'construction_foreign_company_worker_count',
  'other_society_worker_count',
  'other_own_use_worker_count',
  'other_foreign_company_worker_count',
] as const;

const RESULT_SALARY_FIELDS = [
  'external_salary_fund',
  'capital_society_salary_fund',
  'capital_own_use_salary_fund',
  'capital_foreign_company_salary_fund',
  'construction_society_salary_fund',
  'construction_own_use_salary_fund',
  'construction_foreign_company_salary_fund',
  'other_society_salary_fund',
  'other_own_use_salary_fund',
  'other_foreign_company_salary_fund',
] as const;

export const WorkerCategoryMapper = {
  toResource(r: Row): Record<string, unknown> {
    const totalWorker = RESULT_WORKER_FIELDS.reduce(
      (s, f) => s + (Number(r[f]) || 0),
      0,
    );
    const totalSalary = RESULT_SALARY_FIELDS.reduce(
      (s, f) => s + (Number(r[f]) || 0),
      0,
    );

    return {
      id: r.id,
      year: r.year,
      month: r.month,
      external_worker_count: cnt(r.external_worker_count),
      external_salary_fund: sal(r.external_salary_fund),
      capital_society_worker_count: cnt(r.capital_society_worker_count),
      capital_society_salary_fund: sal(r.capital_society_salary_fund),
      capital_own_use_worker_count: cnt(r.capital_own_use_worker_count),
      capital_own_use_salary_fund: sal(r.capital_own_use_salary_fund),
      capital_foreign_company_worker_count: cnt(
        r.capital_foreign_company_worker_count,
      ),
      capital_foreign_company_salary_fund: sal(
        r.capital_foreign_company_salary_fund,
      ),
      construction_society_worker_count: cnt(
        r.construction_society_worker_count,
      ),
      construction_society_salary_fund: sal(r.construction_society_salary_fund),
      construction_own_use_worker_count: cnt(
        r.construction_own_use_worker_count,
      ),
      construction_own_use_salary_fund: sal(r.construction_own_use_salary_fund),
      construction_foreign_company_worker_count: cnt(
        r.construction_foreign_company_worker_count,
      ),
      construction_foreign_company_salary_fund: sal(
        r.construction_foreign_company_salary_fund,
      ),
      other_society_worker_count: cnt(r.other_society_worker_count),
      other_society_salary_fund: sal(r.other_society_salary_fund),
      other_own_use_worker_count: cnt(r.other_own_use_worker_count),
      other_own_use_salary_fund: sal(r.other_own_use_salary_fund),
      other_foreign_company_worker_count: cnt(
        r.other_foreign_company_worker_count,
      ),
      other_foreign_company_salary_fund: sal(
        r.other_foreign_company_salary_fund,
      ),
      temporary_contract_worker_count: cnt(r.temporary_contract_worker_count),
      temporary_contract_salary_fund: sal(r.temporary_contract_salary_fund),
      civil_contract_worker_count: cnt(r.civil_contract_worker_count),
      civil_contract_salary_fund: sal(r.civil_contract_salary_fund),
      freelancer_worker_count: cnt(r.freelancer_worker_count),
      freelancer_salary_fund: sal(r.freelancer_salary_fund),
      result_worker_count: cnt(totalWorker),
      result_salary_fund: sal(totalSalary),
    };
  },
};
