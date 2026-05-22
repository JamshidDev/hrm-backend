// Certificates service. Laravel: LmsCertificateController.
// List: worker brief + edu_plan brief.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { edu_plans, lms_certificates, workers } from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { CertificateMapper } from '@/modules/lms/certificates/certificate.mapper';
import type {
  CertificateListQueryDto,
  GenerateCertificateDto,
} from '@/modules/lms/certificates/dto/certificate.dto';

@Injectable()
export class LmsCertificateService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: CertificateListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(lms_certificates)];
    if (q.edu_plan_id)
      conditions.push(eq(lms_certificates.edu_plan_id, q.edu_plan_id));
    if (q.group_id) conditions.push(eq(lms_certificates.group_id, q.group_id));
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: lms_certificates,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(lms_certificates)
          .where(where)
          .orderBy(desc(lms_certificates.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const workerIds = [
          ...new Set(
            rows.map((r) => r.worker_id).filter((x): x is number => x != null),
          ),
        ];
        const planIds = [
          ...new Set(
            rows
              .map((r) => r.edu_plan_id)
              .filter((x): x is number => x != null),
          ),
        ];

        const [workerRows, planRows] = await Promise.all([
          workerIds.length
            ? this.db
                .select({
                  id: workers.id,
                  last_name: workers.last_name,
                  first_name: workers.first_name,
                  middle_name: workers.middle_name,
                  photo: workers.photo,
                })
                .from(workers)
                .where(inArray(workers.id, workerIds))
            : Promise.resolve(
                [] as Array<{
                  id: number;
                  last_name: string | null;
                  first_name: string | null;
                  middle_name: string | null;
                  photo: string | null;
                }>,
              ),
          planIds.length
            ? this.db
                .select({ id: edu_plans.id, name: edu_plans.name })
                .from(edu_plans)
                .where(inArray(edu_plans.id, planIds))
            : Promise.resolve([] as Array<{ id: number; name: string | null }>),
        ]);

        const workerMap: Record<number, (typeof workerRows)[number]> = {};
        for (const w of workerRows) workerMap[w.id] = w;
        const planMap: Record<number, { id: number; name: string | null }> = {};
        for (const p of planRows) planMap[p.id] = p;

        return rows.map((r) => CertificateMapper.toItem(r, workerMap, planMap));
      },
    });
  }

  async remove(id: number) {
    const [row] = await this.db
      .update(lms_certificates)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(lms_certificates.id, id))
      .returning({ id: lms_certificates.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(_dto: GenerateCertificateDto) {
    return { success: true, stub: true };
  }
}
