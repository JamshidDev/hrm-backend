// VacancyPosition mapper. Laravel transformerlari:
//   VacanciesShowResource, VacanciesEditResource, VacancyApplicationsResource,
//   VacancyApplicationResource, VacancyUserMinimalResource, VacancyUserResource,
//   VacancyApplicationStatusesResource, VacancyApplicationFileResource,
//   VacancyUserCareerResource, VacancyUserEducationResource, CityResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import {
  toLaravelDateTime,
  toLaravelTimestamp,
} from '@/common/utils/datetime.util';

// --- i18n enum kalitlari ---

// VacancyLevelEnum — vacancy_status va application status `type` uchun.
const VACANCY_LEVEL_KEYS: Record<number, string> = {
  1: 'messages.vacancy.levels.one',
  2: 'messages.vacancy.levels.two',
  3: 'messages.vacancy.levels.three',
  4: 'messages.vacancy.levels.four',
  5: 'messages.vacancy.levels.five',
  6: 'messages.vacancy.levels.six',
  7: 'messages.vacancy.levels.seven',
};

// WorkTypeEnum — faqat id 1 mavjud.
const WORK_TYPE_KEYS: Record<number, string> = {
  1: 'messages.vacancy.work_types.one',
};

// EducationEnum.
const EDUCATION_KEYS: Record<number, string> = {
  1: 'messages.education.level.one',
  2: 'messages.education.level.two',
  3: 'messages.education.level.three',
};

// VacancySendStatusEnum — application `status` uchun.
const SEND_STATUS_KEYS: Record<number, string> = {
  1: 'messages.vacancy.user.statues.one',
  2: 'messages.vacancy.user.statues.two',
  3: 'messages.vacancy.user.statues.three',
};

// VacancyFileTypesEnum — application fayllari uchun.
const FILE_TYPE_KEYS: Record<number, string> = {
  1: 'messages.vacancy.file_types.one',
  2: 'messages.vacancy.file_types.two',
  3: 'messages.vacancy.file_types.three',
};

// --- chiqish tiplari ---

export interface IdName {
  id: number;
  name: string | null;
}

export interface CityDto {
  id: number;
  region: IdName | null;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  lat: string | null;
  long: string | null;
}

// --- yordamchi funksiyalar ---

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

// Laravel `EnumEnum::get()` → topilmasa bo'sh string.
function enumIdName(
  i18n: I18nService,
  id: number | null | undefined,
  keys: Record<number, string>,
  lang: string,
): { id: number; name: string } {
  const key = id != null ? keys[id] : undefined;
  return { id: id ?? 0, name: tr(i18n, key, lang) };
}

// Laravel: EducationEnum::get() — {id,name}.
export function eduIdName(
  i18n: I18nService,
  id: number | null | undefined,
  lang: string,
): { id: number; name: string } {
  return enumIdName(i18n, id, EDUCATION_KEYS, lang);
}

// Laravel: VacancyLevelEnum::get() — {id,name}.
export function levelIdName(
  i18n: I18nService,
  id: number | null | undefined,
  lang: string,
): { id: number; name: string } {
  return enumIdName(i18n, id, VACANCY_LEVEL_KEYS, lang);
}

// Lang asosida nom: ru/en bo'sh bo'lsa uz nomiga qaytadi.
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

// Helper::pad_number — chap tomondan nol bilan to'ldirish.
export function padNumber(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

// --- xom row tiplari ---

// CityResource uchun kerakli ustunlar.
export interface CityRow {
  city_id: number | null;
  city_name: string | null;
  city_name_ru: string | null;
  city_name_en: string | null;
  city_lat: string | null;
  city_long: string | null;
  region_id: number | null;
  region_name: string | null;
}

// Vacancy show/edit uchun barcha join qilingan ustunlar.
export interface VacancyDetailRow extends CityRow {
  id: number;
  rate: number;
  to: string | null;
  finish: number;
  salary: number;
  salary_status: boolean;
  phd_status: boolean;
  experience: number;
  vacancy_status: number;
  work_type: number;
  education: number;
  address: string | null;
  position_obligations: string | null;
  qualification_requirements: string | null;
  working_conditions: string | null;
  specialties: string | null;
  status: boolean;
  department_position_id: number | null;
  pos_id: number | null;
  pos_name: string | null;
  pos_name_ru: string | null;
  pos_name_en: string | null;
  dept_id: number | null;
  dept_name: string | null;
  dept_level: number | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
}

// vacancy_users xom row (VacancyUser* resurslar uchun).
export interface VacancyUserRow {
  id: number;
  uuid: string;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birthday: string | null;
  pin: number | null;
  sex: boolean;
  education: number;
  address: string | null;
  photo: string | null;
  nationality_id: number | null;
  country_id: number | null;
  region_id: number | null;
  city_id: number | null;
  current_region_id: number | null;
  current_city_id: number | null;
}

export interface CareerRow {
  id: number;
  from: string | null;
  to: string | null;
  position: string | null;
}

export interface EducationRow {
  id: number;
  from: string | null;
  to: string | null;
  university: string | null;
}

export interface ApplicationStatusRow {
  id: number;
  type: number;
  status: number;
  details: unknown;
  message: string | null;
}

export interface ApplicationFileRow {
  id: number;
  file_type: number;
  file: string | null;
}

export interface ApplicationRow {
  id: number;
  status: number;
  created_at: string | null;
  vacancy_user_id: number;
}

// VacancyUserResource uchun bog'liq ma'lumotlar to'plami.
export interface VacancyUserRelated {
  nationality: IdName | null;
  region: IdName | null;
  city: IdName | null;
  country: IdName | null;
  currentRegion: IdName | null;
  currentCity: IdName | null;
  careers: CareerRow[];
  educations: EducationRow[];
}

// --- mapper funksiyalari ---

// Laravel: CityResource.
export function mapCity(r: CityRow | null): CityDto | null {
  if (!r || !r.city_id) return null;
  return {
    id: r.city_id,
    region: r.region_id
      ? { id: r.region_id, name: r.region_name ?? null }
      : null,
    name: r.city_name,
    name_ru: r.city_name_ru,
    name_en: r.city_name_en,
    lat: r.city_lat,
    long: r.city_long,
  };
}

// Laravel: VacanciesEditResource (show + edit uchun umumiy qism).
export function mapVacancyDetailBase(
  r: VacancyDetailRow,
  i18n: I18nService,
  lang: string,
) {
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
      ? { id: r.dept_id, name: r.dept_name ?? null, level: r.dept_level ?? 0 }
      : null,
    department_position_id: r.department_position_id,
    rate: r.rate,
    to: r.to,
    city: mapCity(r),
    salary: r.salary,
    salary_status: r.salary_status,
    phd_status: r.phd_status,
    experience: r.experience,
    work_type: enumIdName(i18n, r.work_type, WORK_TYPE_KEYS, lang),
    education: enumIdName(i18n, r.education, EDUCATION_KEYS, lang),
    address: r.address,
    position_obligations: r.position_obligations,
    qualification_requirements: r.qualification_requirements,
    working_conditions: r.working_conditions,
    specialties: r.specialties,
    status: r.status,
  };
}

// Laravel: VacancyUserMinimalResource.
export async function mapUserMinimal(u: VacancyUserRow, minio: MinioService) {
  return {
    uuid: u.uuid,
    last_name: u.last_name,
    first_name: u.first_name,
    middle_name: u.middle_name,
    birthday: u.birthday,
    pin: u.pin,
    sex: u.sex,
    education: u.education,
    address: u.address,
    photo: await minio.fileUrl(u.photo),
  };
}

// Laravel: VacancyUserResource — minimal + bog'liq ma'lumotlar.
export async function mapUserFull(
  u: VacancyUserRow,
  minio: MinioService,
  related: VacancyUserRelated,
) {
  const minimal = await mapUserMinimal(u, minio);
  return {
    ...minimal,
    nationality: related.nationality,
    region: related.region,
    city: related.city,
    country: related.country,
    current_region: related.currentRegion,
    current_city: related.currentCity,
    careers: related.careers.map((c) => ({
      id: c.id,
      from: c.from,
      to: c.to,
      position: c.position,
    })),
    educations: related.educations.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      university: e.university,
    })),
  };
}

export type VacancyUserFull = Awaited<ReturnType<typeof mapUserFull>>;

// Laravel: VacancyApplicationStatusesResource.
export function mapApplicationStatus(
  s: ApplicationStatusRow,
  i18n: I18nService,
  lang: string,
) {
  return {
    id: s.id,
    type: enumIdName(i18n, s.type, VACANCY_LEVEL_KEYS, lang),
    status: enumIdName(i18n, s.status, SEND_STATUS_KEYS, lang),
    details: s.details ?? null,
    message: s.message,
  };
}

// Laravel: VacancyApplicationFileResource.
export async function mapApplicationFile(
  f: ApplicationFileRow,
  i18n: I18nService,
  lang: string,
  minio: MinioService,
) {
  return {
    id: f.id,
    file_type: enumIdName(i18n, f.file_type, FILE_TYPE_KEYS, lang),
    file: await minio.fileUrl(f.file),
  };
}

// Laravel: VacancyApplicationsResource (show endpoint'ining `applications` qismi).
export async function mapShowApplication(
  app: ApplicationRow,
  user: VacancyUserRow | null,
  statuses: ApplicationStatusRow[],
  files: ApplicationFileRow[],
  i18n: I18nService,
  lang: string,
  minio: MinioService,
) {
  return {
    id: app.id,
    number: 'URV' + padNumber(app.id, 8),
    user: user ? await mapUserMinimal(user, minio) : null,
    status: enumIdName(i18n, app.status, SEND_STATUS_KEYS, lang),
    statuses: statuses.map((s) => mapApplicationStatus(s, i18n, lang)),
    files: await Promise.all(
      files.map((f) => mapApplicationFile(f, i18n, lang, minio)),
    ),
    // Eloquent xom datetime cast'i — ISO 8601 (".000000Z").
    created_at: toLaravelTimestamp(app.created_at),
  };
}

// Laravel: VacancyApplicationResource (applications list endpoint'i).
export function mapApplicationListItem(
  app: ApplicationRow,
  userFull: VacancyUserFull | null,
  i18n: I18nService,
  lang: string,
) {
  return {
    id: app.id,
    user: userFull,
    number: padNumber(app.id, 8),
    // Laravel: created_at->format('Y-m-d H:i:s').
    created_at: toLaravelDateTime(app.created_at),
    status: enumIdName(i18n, app.status, SEND_STATUS_KEYS, lang),
  };
}
