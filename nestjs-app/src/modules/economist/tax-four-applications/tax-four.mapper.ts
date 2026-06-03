// TaxFourApplicationResource (Laravel) ekvivalenti.
// Modules\Economist\Transformers\Statement\TaxFourApplicationResource bilan mos.

import type { MinioService } from '@/shared/minio/minio.service';
import type { I18nService } from 'nestjs-i18n';
import { numberFormat } from '@/modules/economist/_shared/helpers';

// employee_status / contract_type id → i18n kalit so'zi.
const EMP_WORD: Record<number, string> = { 1: 'one', 2: 'two' };
const CONTRACT_WORD: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
};

export interface TaxFourRow {
  id: number;
  organization_id: number | null;
  worker_id: number | null;
  pin: number | null;
  year: number;
  month: number;
  full_name: string | null;
  position: string | null;
  employee_status: number | null;
  contract_type: number | null;
  total_salary_income: number;
  reported_salary_income: number;
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

export const TaxFourMapper = {
  async toItem(
    r: TaxFourRow,
    lang: string,
    minio: MinioService,
    i18n: I18nService,
  ) {
    // Laravel: employeeStatus($this->employee_status ?? 1); aks holda ' '.
    const empWord = EMP_WORD[r.employee_status ?? 1];
    const ctWord = CONTRACT_WORD[Number(r.contract_type)];
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
      position: r.position,
      employee_status: {
        id: r.employee_status,
        name: empWord
          ? i18n.t(`messages.tax_four.employee_status.${empWord}`, { lang })
          : ' ',
      },
      contract_type: {
        id: r.contract_type,
        name: ctWord
          ? i18n.t(`messages.tax_four.contract_type.${ctWord}`, { lang })
          : ' ',
      },
      total_salary_income: numberFormat(r.total_salary_income, 2, ' '),
      reported_salary_income: numberFormat(r.reported_salary_income, 2, ' '),
      total_tax: numberFormat(r.total_tax, 2, ' '),
      reported_tax: numberFormat(r.reported_tax, 2, ' '),
    };
  },
};
