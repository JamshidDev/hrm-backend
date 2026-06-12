// Integration log service. Laravel: IntegrationApiLogController.
// 9 endpoint: index, users, summary, timeline, topClients, topEndpoints, methods, statuses, update.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import { hmac_users, integration_api_logs, users, workers } from '@/db/schema';
import {
  IntegrationLogMapper,
  type IntegrationLogItem,
} from '@/modules/admin/integration-log/integration-log.mapper';
import type {
  IntegrationLogFilterDto,
  IntegrationLogTimelineDto,
  IntegrationLogTopDto,
  UpdateHmacUserDto,
} from '@/modules/admin/integration-log/dto/integration-log.dto';

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

@Injectable()
export class IntegrationLogService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * Laravel `filteredQuery()` parity — WHERE clauselari.
   * Default: oxirgi 7 kun.
   */
  private filterConditions(q: IntegrationLogFilterDto): SQL {
    const conds: SQL[] = [];
    const now = new Date();
    const dateFrom = q.date_from
      ? new Date(q.date_from + 'T00:00:00Z')
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = q.date_to ? new Date(q.date_to + 'T23:59:59Z') : now;
    conds.push(gte(integration_api_logs.created_at, dateFrom.toISOString()));
    conds.push(lte(integration_api_logs.created_at, dateTo.toISOString()));
    if (q.api_type) conds.push(eq(integration_api_logs.api_type, q.api_type));
    if (q.model_type)
      conds.push(eq(integration_api_logs.model_type, q.model_type));
    if (q.model_id) conds.push(eq(integration_api_logs.model_id, q.model_id));
    if (q.method)
      conds.push(eq(integration_api_logs.method, q.method.toUpperCase()));
    if (q.response_status)
      conds.push(eq(integration_api_logs.response_status, q.response_status));
    if (q.endpoint)
      conds.push(ilike(integration_api_logs.endpoint, `%${q.endpoint}%`));
    if (q.search) {
      const pattern = `%${q.search}%`;
      const orExpr = or(
        ilike(integration_api_logs.secret, pattern),
        ilike(integration_api_logs.endpoint, pattern),
      );
      if (orExpr) conds.push(orExpr);
    }
    const result = and(...conds);
    // `and(...)` `SQL | undefined` qaytaradi — bizda kamida 2 ta cond bor (dates),
    // shuning uchun hech qachon undefined bo'lmaydi, lekin TS uchun guard.
    if (!result) throw new Error('filterConditions: empty WHERE');
    return result;
  }

  /** GET /admin/integration-log — paginated list with filters. */
  async list(q: IntegrationLogFilterDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;
    const where = this.filterConditions(q);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: integration_api_logs.id,
          model_id: integration_api_logs.model_id,
          model_type: integration_api_logs.model_type,
          secret: integration_api_logs.secret,
          api_type: integration_api_logs.api_type,
          endpoint: integration_api_logs.endpoint,
          method: integration_api_logs.method,
          request_headers: integration_api_logs.request_headers,
          request_body: integration_api_logs.request_body,
          response_status: integration_api_logs.response_status,
          response_headers: integration_api_logs.response_headers,
          response_body: integration_api_logs.response_body,
          error: integration_api_logs.error,
          duration_ms: integration_api_logs.duration_ms,
          created_at: integration_api_logs.created_at,
          updated_at: integration_api_logs.updated_at,
        })
        .from(integration_api_logs)
        .where(where)
        .orderBy(desc(integration_api_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(integration_api_logs)
        .where(where),
    ]);

    const data = await this.enrichWithClients(rows);
    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  /** GET /admin/integration-log/users — HmacUser list. */
  async users() {
    const rows = await this.db.select().from(hmac_users);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      public_key: r.public_key,
      secret_type: r.secret_type,
      // Laravel Eloquent ISO8601 (toJson): "Y-m-d\TH:i:s.000000\Z".
      created_at: toLaravelTimestamp(r.created_at),
      updated_at: toLaravelTimestamp(r.updated_at),
      is_active: r.is_active,
    }));
  }

  /** GET /admin/integration-log/summary — counts + avg duration. */
  async summary(q: IntegrationLogFilterDto) {
    const where = this.filterConditions(q);
    const [row] = await this.db
      .select({
        total_requests: count(),
        success_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} BETWEEN 200 AND 299)`,
        error_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} >= 400)`,
        // Laravel selectRaw → PDO numeric'ni STRING qaytaradi ("159.73"/"365.00").
        avg_duration_ms: sql<string>`COALESCE(ROUND(AVG(${integration_api_logs.duration_ms}), 2), 0)`,
        max_duration_ms: sql<number>`COALESCE(MAX(${integration_api_logs.duration_ms}), 0)`,
        unique_clients: sql<number>`COUNT(DISTINCT (COALESCE(${integration_api_logs.model_type}, '') || ':' || COALESCE(${integration_api_logs.model_id}::text, '0')))`,
      })
      .from(integration_api_logs)
      .where(where);
    return {
      total_requests: Number(row.total_requests),
      success_requests: Number(row.success_requests),
      error_requests: Number(row.error_requests),
      avg_duration_ms: row.avg_duration_ms,
      max_duration_ms: Number(row.max_duration_ms),
      unique_clients: Number(row.unique_clients),
    };
  }

  /** GET /admin/integration-log/timeline — group by period. */
  async timeline(q: IntegrationLogTimelineDto) {
    const where = this.filterConditions(q);
    // `to_char(format)` PostgreSQL'da literal kerak — sql.raw() ishlatamiz.
    const formatLiteral =
      q.group_by === 'hour' ? "'YYYY-MM-DD HH24:00:00'" : "'YYYY-MM-DD'";
    const periodExpr = sql<string>`to_char(${integration_api_logs.created_at}, ${sql.raw(formatLiteral)})`;
    const rows = await this.db
      .select({
        period: periodExpr,
        total_requests: count(),
        error_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} >= 400)`,
      })
      .from(integration_api_logs)
      .where(where)
      .groupBy(periodExpr)
      .orderBy(periodExpr);
    return rows.map((r) => ({
      period: r.period,
      total_requests: Number(r.total_requests),
      error_requests: Number(r.error_requests),
    }));
  }

  /** GET /admin/integration-log/top-clients — top by request count. */
  async topClients(q: IntegrationLogTopDto) {
    const limit = Math.min(100, Math.max(1, Number(q?.limit ?? 10)));
    const where = this.filterConditions(q);
    const rows = await this.db
      .select({
        model_type: integration_api_logs.model_type,
        model_id: integration_api_logs.model_id,
        total_requests: count(),
        error_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} >= 400)`,
        avg_duration_ms: sql<number>`COALESCE(ROUND(AVG(${integration_api_logs.duration_ms}), 2), 0)`,
        last_request_at: max(integration_api_logs.created_at),
      })
      .from(integration_api_logs)
      .where(where)
      .groupBy(integration_api_logs.model_type, integration_api_logs.model_id)
      .orderBy(desc(count()))
      .limit(limit);

    const userIds = rows
      .filter((r) => r.model_type === 'App\\Models\\User' && r.model_id != null)
      .map((r) => r.model_id as number);
    const hmacIds = rows
      .filter(
        (r) => r.model_type === 'App\\Models\\HmacUser' && r.model_id != null,
      )
      .map((r) => r.model_id as number);

    const [userRows, hmacRows] = await Promise.all([
      userIds.length
        ? this.fetchUsers(userIds)
        : Promise.resolve({} as Record<number, UserBrief>),
      hmacIds.length
        ? this.fetchHmacUsers(hmacIds)
        : Promise.resolve({} as Record<number, HmacUserBrief>),
    ]);

    return rows.map((r) => {
      let client: ReturnType<typeof IntegrationLogMapper.toItem>['client'] =
        null;
      if (r.model_type === 'App\\Models\\User' && r.model_id != null) {
        const u = userRows[r.model_id];
        const fullName = u?.worker
          ? [u.worker.last_name, u.worker.first_name, u.worker.middle_name]
              .filter(Boolean)
              .join(' ')
              .trim()
          : '';
        client = {
          id: u?.id ?? null,
          type: 'sanctum_user',
          name:
            fullName ||
            (u?.phone ? String(u.phone) : `User #${r.model_id ?? 0}`),
          secret_type: 'sanctum_user',
        };
      } else if (
        r.model_type === 'App\\Models\\HmacUser' &&
        r.model_id != null
      ) {
        const hu = hmacRows[r.model_id];
        client = {
          id: hu?.id ?? null,
          type: 'hmac_user',
          name: hu?.name ?? `HmacUser #${r.model_id ?? 0}`,
          secret_type: hu?.secret_type ?? null,
        };
      }
      return {
        model_type: r.model_type,
        model_id: r.model_id,
        client,
        total_requests: Number(r.total_requests),
        error_requests: Number(r.error_requests),
        avg_duration_ms: Number(r.avg_duration_ms),
        last_request_at: r.last_request_at,
      };
    });
  }

  /** GET /admin/integration-log/top-endpoints — top by request count. */
  async topEndpoints(q: IntegrationLogTopDto) {
    const limit = Math.min(100, Math.max(1, Number(q?.limit ?? 10)));
    const where = this.filterConditions(q);
    const rows = await this.db
      .select({
        endpoint: integration_api_logs.endpoint,
        method: integration_api_logs.method,
        total_requests: count(),
        error_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} >= 400)`,
        avg_duration_ms: sql<string>`COALESCE(ROUND(AVG(${integration_api_logs.duration_ms}), 2), 0)`,
      })
      .from(integration_api_logs)
      .where(where)
      .groupBy(integration_api_logs.endpoint, integration_api_logs.method)
      .orderBy(desc(count()))
      .limit(limit);
    return rows.map((r) => ({
      endpoint: r.endpoint,
      method: r.method,
      total_requests: Number(r.total_requests),
      error_requests: Number(r.error_requests),
      avg_duration_ms: r.avg_duration_ms,
    }));
  }

  /** GET /admin/integration-log/methods — count by HTTP method. */
  async methods(q: IntegrationLogFilterDto) {
    const where = this.filterConditions(q);
    const rows = await this.db
      .select({
        method: integration_api_logs.method,
        total_requests: count(),
        error_requests: sql<number>`COUNT(*) FILTER (WHERE ${integration_api_logs.response_status} >= 400)`,
        avg_duration_ms: sql<string>`COALESCE(ROUND(AVG(${integration_api_logs.duration_ms}), 2), 0)`,
      })
      .from(integration_api_logs)
      .where(where)
      .groupBy(integration_api_logs.method)
      .orderBy(desc(count()));
    return rows.map((r) => ({
      method: r.method,
      total_requests: Number(r.total_requests),
      error_requests: Number(r.error_requests),
      avg_duration_ms: r.avg_duration_ms,
    }));
  }

  /** GET /admin/integration-log/statuses — count by response status. */
  async statuses(q: IntegrationLogFilterDto) {
    const where = this.filterConditions(q);
    const rows = await this.db
      .select({
        response_status: integration_api_logs.response_status,
        total_requests: count(),
      })
      .from(integration_api_logs)
      .where(where)
      .groupBy(integration_api_logs.response_status)
      .orderBy(asc(integration_api_logs.response_status));
    return rows.map((r) => ({
      response_status: r.response_status,
      total_requests: Number(r.total_requests),
    }));
  }

  /** PUT /admin/integration-log/users/:id — update HmacUser. */
  async updateHmacUser(id: number, dto: UpdateHmacUserDto) {
    // Laravel array_filter(!is_null) — null/undefined o'tkazib yuboriladi (false/0/'' qoladi).
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.is_active != null) data.is_active = dto.is_active;
    if (dto.name != null) data.name = dto.name;
    if (dto.public_key != null) data.public_key = dto.public_key;
    if (dto.secret_key != null) data.secret_key = dto.secret_key;
    if (dto.secret_type != null) data.secret_type = dto.secret_type;
    const [row] = await this.db
      .update(hmac_users)
      .set(data)
      .where(eq(hmac_users.id, id))
      .returning({ id: hmac_users.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  private async enrichWithClients(
    rows: Array<{
      id: number;
      model_id: number | null;
      model_type: string | null;
      secret: string | null;
      api_type: string;
      endpoint: string | null;
      method: string | null;
      request_headers: unknown;
      request_body: unknown;
      response_status: number | null;
      response_headers: unknown;
      response_body: unknown;
      error: string | null;
      duration_ms: number | null;
      created_at: string | null;
      updated_at: string | null;
    }>,
  ): Promise<IntegrationLogItem[]> {
    if (!rows.length) return [];
    const userIds = rows
      .filter((r) => r.model_type === 'App\\Models\\User' && r.model_id != null)
      .map((r) => r.model_id as number);
    const hmacIds = rows
      .filter(
        (r) => r.model_type === 'App\\Models\\HmacUser' && r.model_id != null,
      )
      .map((r) => r.model_id as number);

    const [userMap, hmacMap] = await Promise.all([
      userIds.length
        ? this.fetchUsers(userIds)
        : Promise.resolve({} as Record<number, UserBrief>),
      hmacIds.length
        ? this.fetchHmacUsers(hmacIds)
        : Promise.resolve({} as Record<number, HmacUserBrief>),
    ]);

    return rows.map((r) => IntegrationLogMapper.toItem(r, userMap, hmacMap));
  }

  private async fetchUsers(ids: number[]): Promise<Record<number, UserBrief>> {
    const rows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        worker_id: users.worker_id,
      })
      .from(users)
      .where(inArray(users.id, ids));
    const workerIds = rows
      .map((r) => r.worker_id)
      .filter((x): x is number => x != null);
    const workerRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const workerMap: Record<number, (typeof workerRows)[number]> = {};
    for (const w of workerRows) workerMap[w.id] = w;
    const out: Record<number, UserBrief> = {};
    for (const u of rows) {
      out[u.id] = {
        id: u.id,
        phone: u.phone,
        worker: u.worker_id != null ? workerMap[u.worker_id] : undefined,
      };
    }
    return out;
  }

  private async fetchHmacUsers(
    ids: number[],
  ): Promise<Record<number, HmacUserBrief>> {
    const rows = await this.db
      .select({
        id: hmac_users.id,
        name: hmac_users.name,
        secret_type: hmac_users.secret_type,
      })
      .from(hmac_users)
      .where(inArray(hmac_users.id, ids));
    const out: Record<number, HmacUserBrief> = {};
    for (const r of rows) out[r.id] = r;
    return out;
  }
}
