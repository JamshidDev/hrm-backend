// TaxFiveApplicationResource (Laravel) ekvivalenti.
// Modules\Economist\Transformers\Statement\TaxFiveApplicationResource bilan mos.

import type { MinioService } from '@/shared/minio/minio.service';
import type { I18nService } from 'nestjs-i18n';
import { numberFormat } from '@/modules/economist/_shared/helpers';

// income_type id → i18n kalit so'zi. Laravel: 1→one,2→two,3→three, default→four.
const INCOME_WORD: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three' };

export interface TaxFiveRow {
  id: number;
  organization_id: number | null;
  worker_id: number | null;
  pin: number | null;
  year: number;
  month: number;
  full_name: string | null;
  total_income: number;
  reported_income: number;
  income_type: number | null;
  total_tax: number;
  reported_tax: number;
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

export const TaxFiveMapper = {
  async toItem(
    r: TaxFiveRow,
    lang: string,
    minio: MinioService,
    i18n: I18nService,
  ) {
    // Laravel incomeType: match default→four (har doim nom qaytadi).
    const incWord = INCOME_WORD[Number(r.income_type)] ?? 'four';
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
      full_name: r.full_name,
      total_income: numberFormat(r.total_income, 2, ' '),
      reported_income: numberFormat(r.reported_income, 2, ' '),
      income_type: {
        id: r.income_type,
        name: i18n.t(`messages.tax_five.income_type.${incWord}`, { lang }),
      },
      total_tax: numberFormat(r.total_tax, 2, ' '),
      reported_tax: numberFormat(r.reported_tax, 2, ' '),
    };
  },
};
