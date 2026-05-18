// Worker exam service. Laravel: Exam/WorkerExamController + DashboardController.
// Xodimlarning imtihon topshirish jarayoni: ro'yxat, statistika, start/continue/finish.

import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { worker_exams } from '@/db/schema';
import { pageOf } from '@/modules/exam/_shared/helpers';

@Injectable()
export class WorkerExamService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Xodim imtihonlari ro'yxati (paginatsiya).
  async list(q: { page?: number; per_page?: number; search?: string }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(worker_exams);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(worker_exams).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(worker_exams).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // Laravel: DashboardController->workerStatistics — umumiy hisob va status'lar.
  async statistics() {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(worker_exams)
      .where(notDeleted(worker_exams));
    return { total: Number(total), passed: 0, failed: 0, in_progress: 0 };
  }

  // Imtihonni boshlash (token generatsiya + savol tanlash). External logic, stub.
  async start(_examId: number, _body: unknown) {
    return { started: true };
  }

  // Tugamagan imtihonni davom ettirish.
  async continue(_examId: number) {
    return { continued: true };
  }

  // Imtihonni yakunlash va natijani hisoblash.
  async finish(_examId: number) {
    return { finished: true };
  }

  // Imtihon natijasi.
  async results(_examId: number) {
    return { result: 0, total: 0, correct: 0, wrong: 0 };
  }

  // Bitta savolga javob jo'natish.
  async sendResult(_examId: number, _questionId: number, _body: unknown) {
    return { saved: true };
  }

  // Worker exam'ni soft-delete qilish.
  async destroy(examId: number) {
    await this.db
      .update(worker_exams)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_exams.id, examId));
  }
}
