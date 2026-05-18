// Vacancy exam service. Laravel: Vacancy/VacancyExamController + VacancyExamService.
// Nomzodning imtihon topshirish jarayoni: start, send-result, continue, finish, results.
//
// ESLATMA: Laravel imtihon logikasi murakkab (savol tanlash, token, vaqt nazorati).
// Hozircha DB-backed minimal implementatsiya + stub javoblar.

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { vacancy_application_exams } from '@/db/schema';
import type { StartExamDto } from '@/modules/vacancy/exams/dto/exam.dto';

@Injectable()
export class VacancyExamService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // POST .../exam/start — imtihonni boshlash (created vaqti + token o'rnatiladi).
  async start(_applicationId: number, dto: StartExamDto) {
    const [examRow] = await this.db
      .select()
      .from(vacancy_application_exams)
      .where(
        and(
          eq(vacancy_application_exams.id, dto.vacancy_application_exam_id),
          notDeleted(vacancy_application_exams),
        ),
      )
      .limit(1);
    if (!examRow) {
      throw new BusinessException(404, 'not_found');
    }
    await this.db
      .update(vacancy_application_exams)
      .set({ created: sql`NOW()`, status: true, updated_at: sql`NOW()` })
      .where(eq(vacancy_application_exams.id, examRow.id));
    return { exam_id: examRow.id, started_at: new Date().toISOString() };
  }

  // POST .../exam/:examId/send-result/:questionId — bitta savolga javob jo'natish.
  async sendResult(_examId: number, _questionId: number, _body: unknown) {
    return { saved: true };
  }

  // POST .../exam/:examId/continue — tugamagan imtihonni davom ettirish.
  async continue(examId: number) {
    const [examRow] = await this.db
      .select()
      .from(vacancy_application_exams)
      .where(eq(vacancy_application_exams.id, examId))
      .limit(1);
    if (!examRow) {
      throw new BusinessException(404, 'not_found');
    }
    return { exam_id: examRow.id, current_question: 1, total: 0 };
  }

  // POST .../exam/:examId/finish — imtihonni yakunlash, natijani saqlash.
  async finish(_applicationId: number, examId: number) {
    const [examRow] = await this.db
      .select()
      .from(vacancy_application_exams)
      .where(eq(vacancy_application_exams.id, examId))
      .limit(1);
    if (!examRow) {
      throw new BusinessException(404, 'not_found');
    }
    await this.db
      .update(vacancy_application_exams)
      .set({ ended: sql`NOW()`, status: false, updated_at: sql`NOW()` })
      .where(eq(vacancy_application_exams.id, examId));
    return { exam_id: examRow.id, finished: true, result: examRow.result ?? 0 };
  }

  // GET .../exam/:examId/results — imtihon natijasi.
  async results(examId: number) {
    const [examRow] = await this.db
      .select()
      .from(vacancy_application_exams)
      .where(eq(vacancy_application_exams.id, examId))
      .limit(1);
    if (!examRow) {
      throw new BusinessException(404, 'not_found');
    }
    return {
      exam_id: examRow.id,
      result: examRow.result ?? 0,
      created: examRow.created,
      ended: examRow.ended,
    };
  }
}
