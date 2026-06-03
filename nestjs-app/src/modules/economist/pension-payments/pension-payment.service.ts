// Pension payment service. Laravel: Economist/PensionPaymentController.

import { Injectable } from '@nestjs/common';
import { and, count, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { pension_payments, organizations, workers } from '@/db/schema';
import {
  economistAssetUrl,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { PensionMapper } from '@/modules/economist/pension-payments/pension-payment.mapper';

interface PensionListQuery extends PageQueryLike {
  organizations?: string;
  organization_id?: number;
  search?: string;
}

@Injectable()
export class PensionPaymentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/economist/pension-payments — Laravel
  // PensionPayment::filter($user, request()->all()) + year/month +
  // search(whereHas worker) + with(worker) + paginate(per_page ?? 10).
  async list(q: PensionListQuery) {
    const lang = this.ctx.lang;
    const year =
      q.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    // Laravel filter($user, request()->all()) — rol org-scope + organizations csv.
    const inScope = await this.scope.whereOrg(
      pension_payments.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );
    const conds: SQL[] = [
      notDeleted(pension_payments),
      eq(pension_payments.year, year),
      eq(pension_payments.month, month),
    ];
    if (inScope) conds.push(inScope);

    // search: whereHas('worker', searchByFullName).
    if (q.search) {
      const workerCond = buildWorkerSearchCond(q.search);
      if (workerCond) {
        conds.push(
          sql`exists (select 1 from ${workers} where ${workers.id} = ${pension_payments.worker_id} and ${workers.deleted_at} is null and (${workerCond}))`,
        );
      }
    }

    const where = and(...conds);

    // Laravel paginate() — count-first; total=0 bo'lsa items query yo'q.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(pension_payments)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    // Laravel index'da orderBy yo'q → PG natural order.
    const rows = await this.db
      .select({
        id: pension_payments.id,
        organization_id: pension_payments.organization_id,
        worker_id: pension_payments.worker_id,
        pin: pension_payments.pin,
        year: pension_payments.year,
        month: pension_payments.month,
        last_name: pension_payments.last_name,
        first_name: pension_payments.first_name,
        middle_name: pension_payments.middle_name,
        income_tax_paid: pension_payments.income_tax_paid,
        mandatory_pension_contribution:
          pension_payments.mandatory_pension_contribution,
        voluntary_pension_contribution:
          pension_payments.voluntary_pension_contribution,
        total_contributions: pension_payments.total_contributions,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        w_id: workers.id,
        w_last_name: workers.last_name,
        w_first_name: workers.first_name,
        w_middle_name: workers.middle_name,
        w_photo: workers.photo,
      })
      .from(pension_payments)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, pension_payments.organization_id),
          notDeleted(organizations),
        ),
      )
      .leftJoin(
        workers,
        and(eq(workers.id, pension_payments.worker_id), notDeleted(workers)),
      )
      .where(where)
      .limit(perPage)
      .offset(offset);

    const data = await Promise.all(
      rows.map((r) => PensionMapper.toItem(r, lang, this.minio)),
    );
    return { current_page: page, total: totalNum, data };
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(pension_payments)
      .where(eq(pension_payments.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async create(_body: unknown) {
    return { created: true };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(_id: number, _body: unknown) {
    return { updated: true };
  }

  async remove(id: number) {
    await this.db
      .update(pension_payments)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(pension_payments.id, id));
  }

  // GET /api/v1/economist/pension-example — namuna Excel URL.
  example() {
    return { url: economistAssetUrl('pension-payment.xlsx') };
  }
}
