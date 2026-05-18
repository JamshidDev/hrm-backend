// Vacation internal row types.

export interface VacationRow {
  id: number;
  type: number;
  from: string | null;
  to: string | null;
  work_day: string | null;
  rest_day: number;
  main_day: number;
  second_day: number;
  wp_id: number | null;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_birthday: string | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_name: string | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  org_full_name: string | null;
}
