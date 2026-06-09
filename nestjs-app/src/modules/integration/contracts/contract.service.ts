// Integration contracts service. Laravel: IntegrationController.contracts +
// PositionController.index (classifications/positions).

import { Injectable } from '@nestjs/common';
import { and, count, desc } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { contracts, positions } from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

@Injectable()
export class IntegrationContractService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
  ) {}

  /** GET /integration/contracts — paginatsiya. */
  async listContracts(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    // Laravel Contract::query()->filter($user, $filters) — rol/org-scope.
    const inScope = await this.scope.whereOrg(contracts.organization_id, {
      organizations: (q as { organizations?: string }).organizations,
      organization_id: (q as { organization_id?: number }).organization_id,
    });
    const where = and(notDeleted(contracts), inScope);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(contracts)
        .where(where)
        .orderBy(desc(contracts.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(contracts).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/classifications/positions — paginatsiya. */
  async classificationPositions(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(positions);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(positions)
        .where(where)
        .orderBy(positions.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(positions).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }
}
