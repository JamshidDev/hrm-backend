// Topic service. Laravel: Exam/TopicController.

import { Injectable } from '@nestjs/common';
import { count, eq, ilike, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { topics } from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import type {
  CreateTopicDto,
  QueryTopicDto,
  UpdateTopicDto,
} from '@/modules/exam/topics/dto/topic.dto';

@Injectable()
export class TopicService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  // Topic'larni paginatsiya bilan ro'yxatlash. `search` query bo'yicha name filter.
  async list(q: QueryTopicDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(topics)];
    if (q.search) conds.push(ilike(topics.name, `%${q.search}%`));
    const where = conds.length > 1 ? sql`${conds[0]} AND ${conds[1]}` : conds[0];
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(topics).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(topics).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // Bitta topic'ni ko'rsatish. Laravel `findOrFail` ekvivalenti → 404 agar topilmasa.
  async show(id: number) {
    const [row] = await this.db.select().from(topics).where(eq(topics.id, id)).limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // Yangi topic yaratish. `user_id` joriy foydalanuvchidan olinadi.
  async create(dto: CreateTopicDto) {
    const id = await nextId(this.db, topics);
    await this.db.insert(topics).values({
      id,
      name: dto.name,
      type: dto.type ?? 1,
      organization_id: dto.organization_id ?? null,
      user_id: this.ctx.user_or_fail.id,
    });
  }

  // Mavjud topic'ni yangilash.
  async update(id: number, dto: UpdateTopicDto) {
    await this.db
      .update(topics)
      .set({
        name: dto.name,
        type: dto.type ?? 1,
        organization_id: dto.organization_id ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(topics.id, id));
  }

  // Topic'ni soft-delete qilish (deleted_at = NOW()).
  async remove(id: number) {
    await this.db
      .update(topics)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(topics.id, id));
  }

  // Laravel: filter/topics — PaginateResource bilan o'ralgan {id, name} ro'yxat.
  async filter(q: QueryTopicDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(topics);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ id: topics.id, name: topics.name })
        .from(topics)
        .where(where)
        .orderBy(topics.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(topics).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }
}
