// Tax-five application service. Laravel: Economist/TaxFiveApplicationController.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { tax_five_applications, organizations, workers } from '@/db/schema';
import {
  economistAssetUrl,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import {
  TaxFiveMapper,
  type TaxFiveRow,
} from '@/modules/economist/tax-five-applications/tax-five.mapper';

interface TaxFiveListQuery extends PageQueryLike {
  organizations?: string;
  organization_id?: number;
  search?: string;
}

@Injectable()
export class TaxFiveService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/economist/tax-five-applications — Laravel
  // TaxFiveApplication::filter($user, request()->all()) + year/month +
  // search(whereHas worker) + with(worker) + paginate(per_page ?? 10).
  async list(q: TaxFiveListQuery) {
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
      tax_five_applications.organization_id,
      { organizations: q.organizations, organization_id: q.organization_id },
    );
    const conds: SQL[] = [
      notDeleted(tax_five_applications),
      eq(tax_five_applications.year, year),
      eq(tax_five_applications.month, month),
    ];
    if (inScope) conds.push(inScope);

    // search: whereHas('worker', searchByFullName).
    if (q.search) {
      const workerCond = buildWorkerSearchCond(q.search);
      if (workerCond) {
        conds.push(
          sql`exists (select 1 from ${workers} where ${workers.id} = ${tax_five_applications.worker_id} and ${workers.deleted_at} is null and (${workerCond}))`,
        );
      }
    }

    const where = and(...conds);

    // Laravel paginate() — count-first; total=0 bo'lsa items query yo'q.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(tax_five_applications)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    // Laravel index'da orderBy yo'q → PG natural order.
    const rows = await this.db
      .select({
        id: tax_five_applications.id,
        organization_id: tax_five_applications.organization_id,
        worker_id: tax_five_applications.worker_id,
        pin: tax_five_applications.pin,
        year: tax_five_applications.year,
        month: tax_five_applications.month,
        full_name: tax_five_applications.full_name,
        total_income: tax_five_applications.total_income,
        reported_income: tax_five_applications.reported_income,
        income_type: tax_five_applications.income_type,
        total_tax: tax_five_applications.total_tax,
        reported_tax: tax_five_applications.reported_tax,
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
      .from(tax_five_applications)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, tax_five_applications.organization_id),
          notDeleted(organizations),
        ),
      )
      .leftJoin(
        workers,
        and(
          eq(workers.id, tax_five_applications.worker_id),
          notDeleted(workers),
        ),
      )
      .where(where)
      .limit(perPage)
      .offset(offset);

    const data = await Promise.all(
      rows.map((r) =>
        TaxFiveMapper.toItem(r as TaxFiveRow, lang, this.minio, this.i18n),
      ),
    );
    return { current_page: page, total: totalNum, data };
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(tax_five_applications)
      .where(eq(tax_five_applications.id, id))
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
      .update(tax_five_applications)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(tax_five_applications.id, id));
  }

  // GET /api/v1/economist/tax-five-example — namuna Excel URL.
  example() {
    return { url: economistAssetUrl('tax-five.xlsx') };
  }
}
