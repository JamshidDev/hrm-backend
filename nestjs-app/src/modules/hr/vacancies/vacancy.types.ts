// Vacancy internal row types.

export interface VacancyRow {
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
  status: boolean;
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
  city_id: number | null;
  city_name: string | null;
  city_name_ru: string | null;
  city_name_en: string | null;
  city_lat: string | null;
  city_long: string | null;
  region_id: number | null;
  region_name: string | null;
  applications_count: number;
}
