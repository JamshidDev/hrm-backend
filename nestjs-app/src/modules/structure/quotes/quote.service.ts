import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { quotes } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { QuoteMapper } from '@/modules/structure/quotes/quote.mapper';
import {
  QueryQuoteDto,
  CreateQuoteDto,
  QuoteListResponseDto,
  QuoteItemDto,
} from '@/modules/structure/quotes/dto/quote.dto';
import { validateQuoteUpdate } from '@/modules/structure/quotes/quote.validation';

@Injectable()
export class QuoteService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryQuoteDto): Promise<QuoteListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const where = { deleted_at: { isNull: true as const } };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.quotes.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.quotes.findMany({ where, limit, offset }),
      page,
      perPage,
      mapper: QuoteMapper.toItem,
    });
  }

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

  async update(id: number, body: unknown): Promise<void> {
    // Laravel: route-model binding (404) validate()'dan oldin ishlaydi.
    await findByIdOrFail(this.db, quotes, id, this.i18n);

    // sometimes|string — faqat berilgan field'lar yoziladi (partial replace).
    const partial = validateQuoteUpdate(body);
    if (partial.text === undefined && partial.author === undefined) return;

    await this.db.update(quotes).set(partial).where(eq(quotes.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, quotes, id, this.i18n);
    await softDeleteById(this.db, quotes, id);
  }
}
