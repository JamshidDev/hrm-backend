// Tax-four application service. Laravel: Economist/TaxFourApplicationController.

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { tax_four_applications } from '@/db/schema';
import {
  paginateByYearMonth,
  economistAssetUrl,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';

@Injectable()
export class TaxFourService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: PageQueryLike) {
    return paginateByYearMonth(this.db, tax_four_applications, q);
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(tax_four_applications)
      .where(eq(tax_four_applications.id, id))
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
      .update(tax_four_applications)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(tax_four_applications.id, id));
  }

  // GET /api/v1/economist/tax-four-example — namuna Excel URL.
  example() {
    return { url: economistAssetUrl('tax-four.xlsx') };
  }
}
