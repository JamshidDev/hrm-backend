// StatementResource (Laravel) ekvivalenti — statements list item shape.
// Modules\Economist\Transformers\Statement\StatementResource bilan bayt-bayt mos.

import type { MinioService } from '@/shared/minio/minio.service';
import { numberFormat } from '@/modules/economist/_shared/helpers';

// Drizzle select natijasidagi qator (statement + organization + worker join).
export interface StatementRow {
  id: number;
  organization_id: number | null;
  worker_id: number | null;
  main_salary: number;
  work_time: number;
  full_name: string | null;
  position: string | null;
  pin: number | null;
  year: number;
  month: number;
  total_one: number;
  total_two: number;
  total_three: number;
  total_four: number;
  total_five: number;
  // organization join (notDeleted bo'lsa null bo'lishi mumkin)
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  // worker join (worker_id null yoki soft-deleted bo'lsa null)
  w_id: number | null;
  w_last_name: string | null;
  w_first_name: string | null;
  w_middle_name: string | null;
  w_photo: string | null;
}

export interface StatementItem {
  id: number;
  organization: { id: number; name: string | null; group: boolean } | null;
  worker: {
    id: number;
    photo: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null;
  full_name: string | null;
  pin: number | null;
  worker_id: number | null;
  position: string | null;
  work_time: number;
  main_salary: string;
  year: number;
  month: number;
  total_one: string;
  total_two: string;
  total_three: string;
  total_four: string;
  total_five: string;
  diff: boolean;
}

export const StatementMapper = {
  async toItem(
    r: StatementRow,
    lang: string,
    minio: MinioService,
  ): Promise<StatementItem> {
    return {
      id: r.id,
      // Laravel: new OrganizationListResource($this->organization) — null → null.
      // OrganizationListResource: ru→name_ru, en→name_en, default→name (FALLBACK YO'Q).
      organization:
        r.org_id != null
          ? {
              id: r.org_id,
              name:
                lang === 'ru'
                  ? r.org_name_ru
                  : lang === 'en'
                    ? r.org_name_en
                    : r.org_name,
              group: r.org_group ?? false,
            }
          : null,
      // Laravel: new WorkerMinimalResource($this->worker) — null → null.
      worker:
        r.w_id != null
          ? {
              id: r.w_id,
              photo: await minio.fileUrl(r.w_photo),
              last_name: r.w_last_name,
              first_name: r.w_first_name,
              middle_name: r.w_middle_name,
            }
          : null,
      full_name: r.full_name,
      pin: r.pin,
      worker_id: r.worker_id,
      position: r.position,
      work_time: r.work_time,
      main_salary: numberFormat(r.main_salary, 2, ' '),
      year: r.year,
      month: r.month,
      total_one: numberFormat(r.total_one, 2, ' '),
      total_two: numberFormat(r.total_two, 2, ' '),
      total_three: numberFormat(r.total_three, 2, ' '),
      total_four: numberFormat(r.total_four, 2, ' '),
      total_five: numberFormat(r.total_five, 2, ' '),
      // Laravel: $this->total_four === $this->total_five (xom qiymatlar solishtiruvi).
      diff: r.total_four === r.total_five,
    };
  },
};
