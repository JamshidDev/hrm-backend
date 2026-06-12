// Activity logs service. Laravel: app/Http/Controllers/Admin/ActivityLogController.
// ActivityLog::search()->filterByUserOrganization()->orderByDesc('id')->paginate
//   → ActivityLogResource {id, subject_type, properties, causer(UserInfoResource), description, created_at}.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import { activity_log, users, workers } from '@/db/schema';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';

export interface QueryActivityLogDto {
  page?: number;
  per_page?: number;
  search?: string;
  description?: string;
  created_at?: string;
  subject_type?: string;
  organizations?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
  ) {}

  async index(q: QueryActivityLogDto) {
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    // filterByUserOrganization — causer_id ∈ (org-scoped users).
    const usersOrgCond = await this.scope.whereOrg(users.organization_id, {
      organizations: q.organizations,
    });
    const scopedUserIds = this.db
      .select({ id: users.id })
      .from(users)
      .where(usersOrgCond);

    // scopeSearch — whereHas('user', search) + description/created_at/subject_type.
    const searchCond = q.search ? buildWorkerSearchCond(q.search) : undefined;
    const userExists = searchCond
      ? sql`EXISTS (SELECT 1 FROM ${users} su JOIN ${workers} ON ${workers.id} = su.worker_id WHERE su.id = ${activity_log.causer_id} AND ${searchCond})`
      : sql`EXISTS (SELECT 1 FROM ${users} su WHERE su.id = ${activity_log.causer_id})`;

    const conds: SQL[] = [
      inArray(activity_log.causer_id, scopedUserIds),
      userExists,
    ];
    if (q.description) conds.push(eq(activity_log.description, q.description));
    if (q.created_at)
      conds.push(sql`DATE(${activity_log.created_at}) = ${q.created_at}`);
    if (q.subject_type)
      conds.push(
        sql`${activity_log.subject_type} ILIKE ${`%${q.subject_type}%`}`,
      );

    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(activity_log)
        .where(where)
        .orderBy(desc(activity_log.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(activity_log).where(where),
    ]);

    // causer (UserInfoResource) batch.
    const causerIds = [
      ...new Set(
        rows.map((r) => r.causer_id).filter((v): v is number => v != null),
      ),
    ];
    const causerRows = causerIds.length
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
          .where(inArray(users.id, causerIds))
      : [];
    const causerMap = new Map(causerRows.map((u) => [u.id, u]));

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const c =
            r.causer_id != null ? causerMap.get(r.causer_id) : undefined;
          const causer = c
            ? {
                id: c.id,
                uuid: c.uuid,
                worker: c.w_id
                  ? {
                      id: c.w_id,
                      photo: await this.minio.fileUrl(c.w_photo),
                      last_name: c.w_last,
                      first_name: c.w_first,
                      middle_name: c.w_middle,
                    }
                  : null,
                phone: c.phone,
              }
            : null;
          return {
            id: r.id,
            subject_type: r.subject_type,
            properties: r.properties,
            causer,
            description: r.description,
            created_at: toLaravelTimestamp(r.created_at),
          };
        }),
      ),
    };
  }
}
