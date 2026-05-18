// Contract internal row types.

export interface ContractRow {
  id: number;
  number: string | null;
  file: string | null;
  confirmation_file: string | null;
  contract_date: string | null;
  type: number;
  command_status: number;
  status: number;
  confirmation: number;
  generate: number;
  created_at: string | null;
  user_id: number | null;
  worker_id: number | null;
  worker_uuid: string | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_birthday: string | null;
  worker_pin: number | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
}
