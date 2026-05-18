// Auth guard tekshirgandan keyin request.user'ga joylanadi.

export interface AuthUser {
  id: number;
  uuid: string;
  phone: string;
  worker_id: number | null;
  organization_id: number | null;
  status: boolean;
  token_id: number;
}
