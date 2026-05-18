// VacationScheduleYear internal row types.

export interface VacationScheduleYearRow {
  id: number;
  year: number;
  number: string | null;
  date: string | null;
  file: string | null;
  confirmation_file: string | null;
  generate: number;
  confirmation: number;
  organization_id: number | null;
  director_id: number | null;
  trade_union_id: number | null;
  creator_id: number | null;
}

export interface VSYOrgRow {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  group: boolean | null;
  full_name: string | null;
}

export interface VSYConfirmationWorkerRow {
  id: number;
  position: string | null;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
}

export interface VSYCreatorRow {
  id: number;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  org_full_name: string | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_name: string | null;
}
