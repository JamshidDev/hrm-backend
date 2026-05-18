// Command internal row types.

export interface CommandRow {
  id: number;
  command_number: string | null;
  command_date: string | null;
  type: number;
  file: string | null;
  confirmation_file: string | null;
  generate: number;
  created_at: string | null;
  confirmation: number;
  organization_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
}

export interface CommandWorkerConfirmationRow {
  id: number;
  command_id: number | null;
  position: string | null;
  worker_id: number | null;
  worker_uuid: string | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
}
