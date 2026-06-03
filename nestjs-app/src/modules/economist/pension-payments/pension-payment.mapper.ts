// PensionPaymentApplicationResource (Laravel) ekvivalenti.
// Modules\Economist\Transformers\Statement\PensionPaymentApplicationResource bilan mos.
// Eslatma: 4 ta hissa maydoni XOM qiymat (number_format YO'Q).

import type { MinioService } from '@/shared/minio/minio.service';

export interface PensionRow {
  id: number;
  organization_id: number | null;
  worker_id: number | null;
  pin: number | null;
  year: number;
  month: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  income_tax_paid: number;
  mandatory_pension_contribution: number;
  voluntary_pension_contribution: number;
  total_contributions: number;
  // organization join
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  // worker join
  w_id: number | null;
  w_last_name: string | null;
  w_first_name: string | null;
  w_middle_name: string | null;
  w_photo: string | null;
}

export const PensionMapper = {
  async toItem(r: PensionRow, lang: string, minio: MinioService) {
    return {
      id: r.id,
      // Laravel OrganizationListResource: ru→name_ru, en→name_en, default→name (fallback YO'Q).
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
      // Laravel WorkerMinimalResource — null → null.
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
      year: r.year,
      month: r.month,
      pin: r.pin,
      // pension_payments jadvalidagi alohida ism maydonlari (full_name EMAS).
      last_name: r.last_name,
      first_name: r.first_name,
      middle_name: r.middle_name,
      // Laravel: xom qiymatlar (number_format yo'q).
      income_tax_paid: r.income_tax_paid,
      mandatory_pension_contribution: r.mandatory_pension_contribution,
      voluntary_pension_contribution: r.voluntary_pension_contribution,
      total_contributions: r.total_contributions,
    };
  },
};
