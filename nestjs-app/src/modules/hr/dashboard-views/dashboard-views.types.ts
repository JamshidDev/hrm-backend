// HR Dashboard Views — common worker-position row shape.

export interface WorkerPositionViewRow {
  wp_id: number;
  wp_type: number;
  worker_id: number | null;
  worker_uuid: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_birthday: string | null;
  worker_photo: string | null;
  worker_education: number | null;
  dept_id: number | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_id: number | null;
  pos_name: string | null;
  pos_name_ru: string | null;
  pos_name_en: string | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
}

export const ACTIVE_POSITION_STATUS = 2;
export const FINISHED_POSITION_STATUS = 3;
export const CONFIRMATION_SUCCESS = 3;
