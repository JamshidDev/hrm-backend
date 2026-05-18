// Nationality service. Laravel: HR/NationalityController + NationalityService.
// scopeSearch: name LIKE.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { nationalities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { NationalityMapper } from '@/modules/hr/nationalities/nationality.mapper';
import {
  QueryNationalityDto,
  CreateNationalityDto,
  UpdateNationalityDto,
  NationalityListResponseDto,
} from '@/modules/hr/nationalities/dto/nationality.dto';

@Injectable()
export class NationalityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(
    filters: QueryNationalityDto,
  ): Promise<NationalityListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const where = and(
      notDeleted(nationalities),
      filters.search
        ? ilike(nationalities.name, `%${filters.search}%`)
        : undefined,
    );

    return paginate({
      db: this.db,
      countTable: nationalities,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(nationalities)
          .where(where)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: NationalityMapper.toItem,
    });
  }

  async create(dto: CreateNationalityDto): Promise<void> {
    await this.db.insert(nationalities).values({
      name: dto.name,
    });
  }

  async update(id: number, dto: UpdateNationalityDto): Promise<void> {
    await this.findById(id);
    await this.db
      .update(nationalities)
      .set({ name: dto.name })
      .where(eq(nationalities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(nationalities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(nationalities.id, id));
  }

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: nationalities.id })
      .from(nationalities)
      .where(and(eq(nationalities.id, id), notDeleted(nationalities)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
