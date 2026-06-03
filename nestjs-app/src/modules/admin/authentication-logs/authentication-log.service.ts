// Authentication logs service. Laravel: Admin/AuthenticationLogController.
// AuthenticationLog::search()->filterByUserOrganization()->orderByDesc('id')->paginate
//   → AuthenticationLogResource {id, user(UserInfoResource), ip_address, user_agent, login_at, logout_at}.

import { Injectable } from '@nestjs/common';
import { and, count, desc, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { eq } from 'drizzle-orm';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import { authentication_log, users, workers } from '@/db/schema';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';

export interface QueryAuthLogDto {
  page?: number;
  per_page?: number;
  search?: string;
  login_at?: string;
  ip_address?: string;
  organizations?: string;
}

@Injectable()
export class AuthenticationLogService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
  ) {}

  async index(q: QueryAuthLogDto) {
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    // filterByUserOrganization — authenticatable_id ∈ (org-scoped users).
    const usersOrgCond = await this.scope.whereOrg(users.organization_id, {
      organizations: q.organizations,
    });
    const scopedUserIds = this.db
      .select({ id: users.id })
      .from(users)
      .where(usersOrgCond);

    // scopeSearch — whereHas('user', search) + login_at (date) + ip_address (like).
    const searchCond = q.search ? buildWorkerSearchCond(q.search) : undefined;
    const userExists = searchCond
      ? sql`EXISTS (SELECT 1 FROM ${users} su JOIN ${workers} ON ${workers.id} = su.worker_id WHERE su.id = ${authentication_log.authenticatable_id} AND ${searchCond})`
      : sql`EXISTS (SELECT 1 FROM ${users} su WHERE su.id = ${authentication_log.authenticatable_id})`;

    const conds: SQL[] = [
      inArray(authentication_log.authenticatable_id, scopedUserIds),
      userExists,
    ];
    if (q.login_at)
      conds.push(sql`DATE(${authentication_log.login_at}) = ${q.login_at}`);
    if (q.ip_address)
      conds.push(
        sql`${authentication_log.ip_address} ILIKE ${`%${q.ip_address}%`}`,
      );

    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(authentication_log)
        .where(where)
        .orderBy(desc(authentication_log.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(authentication_log).where(where),
    ]);

    // user (UserInfoResource) batch.
    const userIds = [
      ...new Set(
        rows
          .map((r) => r.authenticatable_id)
          .filter((v): v is number => v != null),
      ),
    ];
    const userRows = userIds.length
      ? await this.db
          .select({
            id: users.id,
            uuid: users.uuid,
            phone: users.phone,
            w_id: workers.id,
            w_photo: workers.photo,
            w_last: workers.last_name,
            w_first: workers.first_name,
            w_middle: workers.middle_name,
          })
          .from(users)
          .leftJoin(workers, eq(workers.id, users.worker_id))
          .where(inArray(users.id, userIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const u = userMap.get(r.authenticatable_id);
          const user = u
            ? {
                id: u.id,
                uuid: u.uuid,
                worker: u.w_id
                  ? {
                      id: u.w_id,
                      photo: await this.minio.fileUrl(u.w_photo),
                      last_name: u.w_last,
                      first_name: u.w_first,
                      middle_name: u.w_middle,
                    }
                  : null,
                phone: u.phone,
              }
            : null;
          return {
            id: r.id,
            user,
            ip_address: r.ip_address,
            user_agent: r.user_agent,
            login_at: r.login_at,
            logout_at: r.logout_at,
          };
        }),
      ),
    };
  }
}
