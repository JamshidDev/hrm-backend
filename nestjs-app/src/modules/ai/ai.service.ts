// AI OpenAI service. Laravel: OpenAIService.
// 4 endpoint: getAiLawyer (stream), likeDislikeQuestion, questionsByDate, groupedHistory.
// Stream + OpenAI API integratsiya hozir stub.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { a_i_questions } from '@/db/schema';
import type {
  AiHistoryQueryDto,
  AiLawyerDto,
  AiLikeDto,
  AiQuestionsByDateDto,
} from '@/modules/ai/dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * POST /ai/lawyer — Laravel stream OpenAI response.
   * NestJS stub — sync response qaytaradi. SSE/stream real implement keyin.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async lawyer(dto: AiLawyerDto) {
    if (!dto.question?.trim()) {
      // Laravel: AIServiceException::emptyQuestion → 400 (parity)
      throw new BusinessException(400, 'empty_question');
    }
    return {
      answer: '(AI stub) ' + dto.question,
      stub: true,
    };
  }

  /** POST /ai/questions/:id/like — like/dislike question. */
  async likeDislike(id: number, dto: AiLikeDto) {
    const [row] = await this.db
      .update(a_i_questions)
      .set({ like: dto.like, updated_at: sql`NOW()` })
      .where(eq(a_i_questions.id, id))
      .returning({ id: a_i_questions.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  /** GET /ai/questions — joriy user'ning savollari (by date). */
  async questionsByDate(dto: AiQuestionsByDateDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');

    const dayStart = new Date(`${dto.date}T00:00:00Z`).toISOString();
    const dayEnd = new Date(`${dto.date}T23:59:59Z`).toISOString();

    const rows = await this.db
      .select()
      .from(a_i_questions)
      .where(
        and(
          eq(a_i_questions.user_id, userId),
          sql`${a_i_questions.created_at} BETWEEN ${dayStart} AND ${dayEnd}`,
        ),
      )
      .orderBy(desc(a_i_questions.id));

    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      like: r.like,
      created_at: r.created_at,
    }));
  }

  /** GET /ai/list — group by date history. */
  async groupedHistory(q: AiHistoryQueryDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));

    const rows = await this.db
      .select({
        date: sql<string>`to_char(${a_i_questions.created_at}, 'YYYY-MM-DD')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(a_i_questions)
      .where(eq(a_i_questions.user_id, userId))
      .groupBy(sql`to_char(${a_i_questions.created_at}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${a_i_questions.created_at}, 'YYYY-MM-DD') DESC`)
      .limit(perPage);

    return rows.map((r) => ({
      date: r.date,
      total: Number(r.total),
    }));
  }
}
