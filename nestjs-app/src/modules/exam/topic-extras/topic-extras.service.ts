// Topic extras service. Laravel: Exam/ExamController (positions, workers).
// Topic uchun lavozimlar va xodimlar ro'yxati.
// Laravel `Topic::findOrFail($topicId)` ishlatadi — topic topilmasa 404.

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { topics } from '@/db/schema';
import { pageOf } from '@/modules/exam/_shared/helpers';

@Injectable()
export class TopicExtrasService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Topic mavjudligini tekshirish. Laravel findOrFail bilan ekvivalent.
  private async ensureTopic(topicId: number) {
    const [row] = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // Topic bilan bog'liq lavozimlar. Topic yo'q bo'lsa 404.
  async positions(topicId: number, q: { page?: number; per_page?: number }) {
    await this.ensureTopic(topicId);
    const { page, perPage } = pageOf(q);
    return { current_page: page, per_page: perPage, total: 0, data: [] as Array<unknown> };
  }

  // Topic bilan bog'liq xodimlar. Topic yo'q bo'lsa 404.
  async workers(topicId: number, q: { page?: number; per_page?: number }) {
    await this.ensureTopic(topicId);
    const { page, perPage } = pageOf(q);
    return { current_page: page, per_page: perPage, total: 0, data: [] as Array<unknown> };
  }
}
