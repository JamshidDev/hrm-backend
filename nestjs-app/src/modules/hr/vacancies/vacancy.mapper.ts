// Vacancy mapper. Laravel: VacanciesResource.

import type { I18nService } from 'nestjs-i18n';
import { VacancyItemDto } from '@/modules/hr/vacancies/dto/vacancy.dto';
import type { VacancyRow } from '@/modules/hr/vacancies/vacancy.types';

const VACANCY_LEVEL_KEYS: Record<number, string> = {
  1: 'messages.vacancy.levels.one',
  2: 'messages.vacancy.levels.two',
  3: 'messages.vacancy.levels.three',
  4: 'messages.vacancy.levels.four',
  5: 'messages.vacancy.levels.five',
  6: 'messages.vacancy.levels.six',
  7: 'messages.vacancy.levels.seven',
};

const WORK_TYPE_KEYS: Record<number, string> = {
  1: 'messages.vacancy.work_types.one',
};

const EDUCATION_KEYS: Record<number, string> = {
  1: 'messages.education.level.one',
  2: 'messages.education.level.two',
  3: 'messages.education.level.three',
};

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

function enumIdName(
  i18n: I18nService,
  id: number | null | undefined,
  keys: Record<number, string>,
  lang: string,
): { id: number; name: string } {
  const key = id != null ? keys[id] : undefined;
  return { id: id ?? 0, name: tr(i18n, key, lang) };
}

function localName(
  name: string | null,
  nameRu: string | null,
  nameEn: string | null,
  lang: string,
): string | null {
  if (lang === 'ru') return nameRu ?? name;
  if (lang === 'en') return nameEn ?? name;
  return name;
}

export const VacancyMapper = {
  toItem(
    this: void,
    r: VacancyRow,
    i18n: I18nService,
    lang: string,
  ): VacancyItemDto {
    return {
      id: r.id,
      organization: r.org_id
        ? {
            id: r.org_id,
            name: localName(r.org_name, r.org_name_ru, r.org_name_en, lang),
            group: r.org_group ?? false,
          }
        : null,
      position: r.pos_id
        ? {
            id: r.pos_id,
            name: localName(r.pos_name, r.pos_name_ru, r.pos_name_en, lang),
          }
        : null,
      department: r.dept_id
        ? { id: r.dept_id, name: r.dept_name ?? '', level: r.dept_level ?? 0 }
        : null,
      rate: r.rate,
      to: r.to,
      finish: r.finish,
      city: r.city_id
        ? {
            id: r.city_id,
            region: r.region_id
              ? { id: r.region_id, name: r.region_name ?? '' }
              : null,
            name: r.city_name,
            name_ru: r.city_name_ru,
            name_en: r.city_name_en,
            lat: r.city_lat,
            long: r.city_long,
          }
        : null,
      salary: r.salary,
      salary_status: r.salary_status,
      phd_status: r.phd_status,
      experience: r.experience,
      vacancy_status: enumIdName(
        i18n,
        r.vacancy_status,
        VACANCY_LEVEL_KEYS,
        lang,
      ),
      work_type: enumIdName(i18n, r.work_type, WORK_TYPE_KEYS, lang),
      education: enumIdName(i18n, r.education, EDUCATION_KEYS, lang),
      applications_count: Number(r.applications_count ?? 0),
      status: r.status,
    };
  },
};
