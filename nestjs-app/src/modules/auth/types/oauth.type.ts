// OAuth exchange-code natijasi (Laravel User to'liq serialize).

export type ExchangeAuthCodeUser = {
  id: number;
  uuid: string;
  phone: number;
  phone_verified_at: string | null;
  is_verified: boolean;
  status: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  organization_id: number | null;
  worker_id: number | null;
  password_changed_at: string | null;
};
