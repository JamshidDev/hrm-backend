// Subjects service. Laravel: SubjectController.

import { Injectable } from '@nestjs/common';
import { desc, eq, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { subjects } from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { SubjectMapper } from '@/modules/lms/subjects/subject.mapper';
import type {
  SubjectListQueryDto,
  UpsertSubjectDto,
} from '@/modules/lms/subjects/dto/subject.dto';

@Injectable()
export class LmsSubjectService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(subjects.id) })
      .from(subjects);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/subjects — paginatsiya. */
  async list(q: SubjectListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = notDeleted(subjects);
    return lmsPaginate({
      db: this.db,
      countTable: subjects,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(subjects)
          .where(where)
          .orderBy(desc(subjects.id))
          .limit(limit)
          .offset(offset),
      mapper: SubjectMapper.toItem,
    });
  }

  /** GET /lms/subjects/:id. */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return SubjectMapper.toItem(row);
  }

  /** POST /lms/subjects. */
  async create(dto: UpsertSubjectDto) {
    const id = await this.nextId();
    const [row] = await this.db
      .insert(subjects)
      .values({
        id,
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return SubjectMapper.toItem(row);
  }

  /** PUT /lms/subjects/:id. */
  async update(id: number, dto: UpsertSubjectDto) {
    const [row] = await this.db
      .update(subjects)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(subjects.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return SubjectMapper.toItem(row);
  }

  /** DELETE /lms/subjects/:id — soft-delete. */
  async remove(id: number) {
    const [row] = await this.db
      .update(subjects)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(subjects.id, id))
      .returning({ id: subjects.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }
}
