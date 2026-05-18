// Quote service. Laravel: QuoteController.
//   - index — paginate
//   - inRandomQuote — bitta random
//   - store/update/destroy — CRUD

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { quotes } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { QuoteMapper } from '@/modules/structure/quotes/quote.mapper';
import {
  QueryQuoteDto,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteListResponseDto,
  QuoteItemDto,
} from '@/modules/structure/quotes/dto/quote.dto';

@Injectable()
export class QuoteService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryQuoteDto): Promise<QuoteListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const where = notDeleted(quotes);

    return paginate({
      db: this.db,
      countTable: quotes,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.select().from(quotes).where(where).limit(limit).offset(offset),
      page,
      perPage,
      mapper: QuoteMapper.toItem,
    });
  }

  // Laravel: Quote::query()->inRandomOrder()->firstOrFail() — random quote yoki 404.
  async findRandom(): Promise<QuoteItemDto> {
    const [row] = await this.db
      .select()
      .from(quotes)
      .where(notDeleted(quotes))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return QuoteMapper.toItem(row);
  }

  async create(dto: CreateQuoteDto): Promise<void> {
    await this.db.insert(quotes).values({
      text: dto.text,
      author: dto.author,
    });
  }

  async update(id: number, dto: UpdateQuoteDto): Promise<void> {
    await this.findById(id);
    await this.db
      .update(quotes)
      .set({
        text: dto.text,
        author: dto.author,
      })
      .where(eq(quotes.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(quotes)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(quotes.id, id));
  }

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.id, id), notDeleted(quotes)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
