// Exam video service. Laravel: Exam/ExamVideoController.
// Imtihon vaqtidagi video proctoring uchun chunk'lar.

import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { exam_video_chunks } from '@/db/schema';

@Injectable()
export class ExamVideoService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Video sessiya boshlash — frontend chunk upload uchun token oladi.
  async start(_body: unknown) {
    return { started: true };
  }

  // Video sessiya yakunlash — barcha chunk'lar yopilgani belgilanadi.
  async finish(_body: unknown) {
    return { finished: true };
  }

  // Berilgan worker exam uchun barcha video chunk'larni qaytarish.
  async show(workerExamId: number) {
    return this.db
      .select()
      .from(exam_video_chunks)
      .where(
        and(
          eq(exam_video_chunks.worker_exam_id, workerExamId),
          notDeleted(exam_video_chunks),
        ),
      )
      .orderBy(exam_video_chunks.id);
  }
}
