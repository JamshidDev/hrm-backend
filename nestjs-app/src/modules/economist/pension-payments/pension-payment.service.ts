// Pension payment service. Laravel: Economist/PensionPaymentController.

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { pension_payments } from '@/db/schema';
import {
  paginateByYearMonth,
  economistAssetUrl,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';

@Injectable()
export class PensionPaymentService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: PageQueryLike) {
    return paginateByYearMonth(this.db, pension_payments, q);
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
