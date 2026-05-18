// University mapper. Laravel: UniversityResource.
// Education + UniversityType enum'larni i18n bilan o'giradi.

import type { I18nService } from 'nestjs-i18n';
import {
  UniversityItemDto,
  UniversityEnumItemDto,
} from '@/modules/structure/universities/dto/university.dto';

// Drizzle row tipi.
export interface UniversityRow {
  id: number;
  city_id: number | null;
  education: number;
  type: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  city: {
    id: number;
    region_id: number;
    name: string;
    name_ru: string | null;
    name_en: string | null;
    lat: string | null;
    long: string | null;
    region: { id: number; name: string } | null;
  } | null;
}

// EducationEnum: 1=HIGH, 2=MEDIUM_SPECIAL, 3=MEDIUM
const EDUCATION_KEYS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
};

// UniversityTypeEnum: 1..6 → one..six
const UNI_TYPE_KEYS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
};

function education(
  i18n: I18nService,
  id: number,
  lang: string,
): UniversityEnumItemDto {
  const key = EDUCATION_KEYS[id];
  const name = key ? i18n.t(`messages.education.level.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

function universityType(
  i18n: I18nService,
  id: number,
  lang: string,
): UniversityEnumItemDto {
  const key = UNI_TYPE_KEYS[id];
  const name = key ? i18n.t(`messages.education.types.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

export const UniversityMapper = {
  toItem(
    this: void,
    u: UniversityRow,
    i18n: I18nService,
    lang: string,
  ): UniversityItemDto {
    return {
      id: u.id,
      // Laravel CityResource: { id, region: minimal, name, name_ru, name_en, lat, long }
      city: u.city
        ? {
            id: u.city.id,
            region: u.city.region
              ? { id: u.city.region.id, name: u.city.region.name }
              : null,
            name: u.city.name,
            name_ru: u.city.name_ru,
            name_en: u.city.name_en,
            lat: u.city.lat,
            long: u.city.long,
          }
        : null,
      education: education(i18n, u.education, lang),
      type: universityType(i18n, u.type, lang),
      name: u.name,
      name_ru: u.name_ru,
      name_en: u.name_en,
    };
  },
};
