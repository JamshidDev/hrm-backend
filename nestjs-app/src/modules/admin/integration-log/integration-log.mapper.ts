// IntegrationApiLog mapper. Laravel: IntegrationApiLogResource.
// Shape: {id, model_id, model_type, client: {id,type,name,secret_type}|null,
//         secret, api_type, endpoint, method, request_headers, request_body,
//         response_status, error, duration_ms, created_at}

import type { integration_api_logs } from '@/db/schema';

type Row = typeof integration_api_logs.$inferSelect;

export interface IntegrationLogClient {
  id: number | null;
  type: 'sanctum_user' | 'hmac_user';
  name: string;
  secret_type: string | null;
}

export interface IntegrationLogItem {
  id: number;
  model_id: number | null;
  model_type: string | null;
  client: IntegrationLogClient | null;
  secret: string | null;
  api_type: string;
  endpoint: string | null;
  method: string | null;
  request_headers: unknown;
  request_body: unknown;
  response_status: number | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string | null;
}

interface UserBrief {
  id: number;
  phone: number | null;
  worker?: {
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  };
}

interface HmacUserBrief {
  id: number;
  name: string;
  secret_type: string;
}

function buildSanctumClient(
  modelId: number,
  user: UserBrief | undefined,
): IntegrationLogClient {
  const fullName = user?.worker
    ? [user.worker.last_name, user.worker.first_name, user.worker.middle_name]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';
  const name =
    fullName || (user?.phone ? String(user.phone) : `User #${modelId}`);
  return {
    id: user?.id ?? null,
    type: 'sanctum_user',
    name,
    secret_type: 'sanctum_user',
  };
}

function buildHmacClient(
  modelId: number,
  hmac: HmacUserBrief | undefined,
): IntegrationLogClient {
  return {
    id: hmac?.id ?? null,
    type: 'hmac_user',
    name: hmac?.name ?? `HmacUser #${modelId}`,
    secret_type: hmac?.secret_type ?? null,
  };
}

export const IntegrationLogMapper = {
  toItem(
    r: Row,
    userMap: Record<number, UserBrief>,
    hmacMap: Record<number, HmacUserBrief>,
  ): IntegrationLogItem {
    let client: IntegrationLogClient | null = null;
    if (r.model_type === 'App\\Models\\User' && r.model_id != null) {
      client = buildSanctumClient(r.model_id, userMap[r.model_id]);
    } else if (r.model_type === 'App\\Models\\HmacUser' && r.model_id != null) {
      client = buildHmacClient(r.model_id, hmacMap[r.model_id]);
    }
    return {
      id: r.id,
      model_id: r.model_id,
      model_type: r.model_type,
      client,
      secret: r.secret,
      api_type: r.api_type,
      endpoint: r.endpoint,
      method: r.method,
      request_headers: r.request_headers,
      request_body: r.request_body,
      response_status: r.response_status,
      error: r.error,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
    };
  },
};
