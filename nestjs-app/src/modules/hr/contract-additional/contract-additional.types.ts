// ContractAdditional internal row types.

export interface ContractAdditionalRow {
  id: number;
  number: number | null;
  file: string | null;
  confirmation_file: string | null;
  contract_date: string | null;
  contract_to_date: string | null;
  type: number;
  command_status: number;
  confirmation: number;
  generate: number;
  created_at: string | null;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_birthday: string | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
}
