// Med pensioners service. Laravel: HR/PensionerController->listMed.
// Pensioner::query()->when(organizations)->search()->with('organization')->paginate
//   → PaginateResource(PensionerResource). Role scope YO'Q, orderBy YO'Q (natural).

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { organizations, pensioners } from '@/db/schema';
import { pageOf } from '@/modules/med/_shared/helpers';

@Injectable()
export class MedPensionerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  // GET /api/v1/med/pensioners
  async list(q: {
    page?: number;
    per_page?: number;
    search?: string;
    organizations?: string;
  }) {
    const { page, perPage, offset } = pageOf(q);
    const lang = this.ctx.lang;

    const conds: SQL[] = [notDeleted(pensioners)];

    // when(organizations) → whereIn(organization_id, explode(',')).
    const ids = (q.organizations ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0);
    if (ids.length) conds.push(inArray(pensioners.organization_id, ids));

    // scopeSearch — har bir so'z (space-split) AND, ichida last/first/middle/pin OR (ILIKE).
    if (q.search && q.search.trim()) {
      for (const term of q.search.trim().split(' ')) {
        if (!term) continue;
        const like = `%${term}%`;
        conds.push(
          or(
            ilike(pensioners.last_name, like),
            ilike(pensioners.first_name, like),
            ilike(pensioners.middle_name, like),
            ilike(sql`${pensioners.pin}::text`, like),
          )!,
        );
      }
    }

    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: pensioners.id,
          last_name: pensioners.last_name,
          first_name: pensioners.first_name,
          middle_name: pensioners.middle_name,
          sex: pensioners.sex,
          position: pensioners.position,
          pin: pensioners.pin,
          address: pensioners.address,
          passport: pensioners.passport,
          experience: pensioners.experience,
          year: pensioners.year,
          phone: pensioners.phone,
          afghan: pensioners.afghan,
          invalid: pensioners.invalid,
          chernobyl: pensioners.chernobyl,
          railway_title: pensioners.railway_title,
          o_id: organizations.id,
          o_name: organizations.name,
          o_name_ru: organizations.name_ru,
          o_name_en: organizations.name_en,
          o_group: organizations.group,
        })
        .from(pensioners)
        .leftJoin(
          organizations,
          eq(organizations.id, pensioners.organization_id),
        )
        // Laravel listMed — orderBy YO'Q (natural order).
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(pensioners).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        sex: r.sex,
        organization: r.o_id
          ? {
              id: r.o_id,
              name:
                lang === 'ru'
                  ? r.o_name_ru
                  : lang === 'en'
                    ? r.o_name_en
                    : r.o_name,
              group: r.o_group,
            }
          : null,
        position: r.position,
        pin: r.pin,
        address: r.address,
        passport: r.passport,
        experience: r.experience,
        year: r.year,
        phone: r.phone,
        afghan: r.afghan,
        invalid: r.invalid,
        chernobyl: r.chernobyl,
        railway_title: r.railway_title,
      })),
    };
  }
}
