// WorkerUniversity mapper. Laravel: WorkerUniversityResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import {
  EDUCATION_TYPES,
  UNIVERSITY_TYPES,
} from '@/modules/structure/enums-endpoint/enums.constants';
import { WorkerUniversityItemDto } from '@/modules/hr/worker-universities/dto/worker-university.dto';
import type { WorkerUniversityRow } from '@/modules/hr/worker-universities/worker-university.types';

const EDUCATION_KEYS: Record<number, string> = Object.fromEntries(
  EDUCATION_TYPES.map((e) => [e.id, e.key]),
);
const UNIVERSITY_TYPE_KEYS: Record<number, string> = Object.fromEntries(
  UNIVERSITY_TYPES.map((u) => [u.id, u.key]),
);

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

function enumIdName(
  i18n: I18nService,
  id: number | null,
  keys: Record<number, string>,
  lang: string,
): { id: number; name: string } {
  const key = id != null ? keys[id] : undefined;
  return { id: id ?? 0, name: tr(i18n, key, lang) };
}

export const WorkerUniversityMapper = {
  async toItem(
    this: void,
    r: WorkerUniversityRow,
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<WorkerUniversityItemDto> {
    return {
      id: r.id,
      speciality: r.spec_id
        ? {
            id: r.spec_id,
            name: r.spec_name,
            name_ru: r.spec_name_ru,
          }
        : null,
      university: r.uni_id
        ? {
            id: r.uni_id,
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
            education: enumIdName(i18n, r.uni_education, EDUCATION_KEYS, lang),
            type: enumIdName(i18n, r.uni_type, UNIVERSITY_TYPE_KEYS, lang),
            name: r.uni_name,
            name_ru: r.uni_name_ru,
            name_en: r.uni_name_en,
          }
        : null,
      from_date: r.from_date,
      to_date: r.to_date,
      file: await minio.fileUrl(r.file),
    };
  },
};
