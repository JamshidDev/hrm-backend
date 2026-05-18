// Med pensioners service. Laravel: HR/PensionerController->listMed.
// Tibbiy ko'rik kontekstida pensionerlar ro'yxati (paginatsiya + organizations filtri).

import { Injectable } from '@nestjs/common';
import { and, count, desc, ilike, inArray, or, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { organizations, pensioners } from '@/db/schema';
import { pageOf } from '@/modules/med/_shared/helpers';

@Injectable()
export class MedPensionerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/med/pensioners — pensionerlar ro'yxati.
  // `organizations` query — vergul bilan ajratilgan organization_id'lar.
  async list(q: {
    page?: number;
    per_page?: number;
    search?: string;
    organizations?: string;
  }) {
    const { page, perPage, offset } = pageOf(q);

    const conds = [notDeleted(pensioners)];
    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
      if (ids.length) {
        conds.push(inArray(pensioners.organization_id, ids));
      }
    }
    if (q.search) {
      const term = `%${q.search}%`;
      conds.push(
        or(
          ilike(pensioners.last_name, term),
          ilike(pensioners.first_name, term),
          ilike(pensioners.middle_name, term),
        )!,
      );
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(pensioners)
        .where(where)
        .orderBy(desc(pensioners.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(pensioners).where(where),
    ]);

    // organization ma'lumotini batch yuklaymiz (N+1 oldini olish).
    const orgIds = [
      ...new Set(rows.map((r) => r.organization_id).filter(Boolean)),

      ...new Set(rows.map((r) => r.organization_id).filter(Boolean)),
    ];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o]));

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          ...r,
          file: await this.minio.fileUrl(r.file),
          organization: r.organization_id
            ? (orgMap.get(r.organization_id) ?? null)
            : null,
        })),
      ),
    };
  }
}
