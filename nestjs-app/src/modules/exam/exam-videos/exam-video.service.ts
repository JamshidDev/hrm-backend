// Exam video service. Laravel: Exam/ExamVideoService.
// Imtihon vaqtidagi video proctoring uchun chunk'lar (MinIO'ga frontend yuklaydi).

import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { exam_video_chunks, worker_exams } from '@/db/schema';
import type { ExamVideoIdDto } from '@/modules/exam/exam-videos/dto/exam-video.dto';

@Injectable()
export class ExamVideoService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // Laravel md5($workerExamId . $workerExam->worker_id) — stringlar konkatenatsiyasi.
  private pathKey(workerExamId: number, workerId: number): string {
    return createHash('md5').update(`${workerExamId}${workerId}`).digest('hex');
  }

  private async findWorkerExamOrFail(id: number) {
    const [we] = await this.db
      .select({
        id: worker_exams.id,
        worker_id: worker_exams.worker_id,
        exam_id: worker_exams.exam_id,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, id))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return we;
  }

  /**
   * POST /exam/worker-exams/start-video — Laravel ExamVideoService::start.
   * Frontend chunk'larni yuklash uchun MinIO prefix-URL'ni qaytaradi.
   */
  async start(dto: ExamVideoIdDto): Promise<{ url: string }> {
    const we = await this.findWorkerExamOrFail(dto.worker_exam_id);
    const path = `exam-videos/${this.pathKey(we.id, we.worker_id)}/${we.id}`;
    return { url: this.minio.objectUrl(path) };
  }

  /**
   * PUT /exam/worker-exams/finish-video — Laravel ExamVideoService::finish.
   * MinIO'dagi yuklangan chunk'larni o'qib, hali yozilmagan yo'llarni
   * exam_video_chunks jadvaliga insert qiladi.
   */
  async finish(dto: ExamVideoIdDto): Promise<void> {
    const we = await this.findWorkerExamOrFail(dto.worker_exam_id);
    const dir = `exam-videos/${this.pathKey(we.id, we.worker_id)}/${we.id}`;

    const files = await this.minio.listFiles(dir);
    if (files.length === 0) return;

    // Mavjud yo'llar — qayta insert qilmaslik uchun.
    const existing = await this.db
      .select({ path: exam_video_chunks.path })
      .from(exam_video_chunks)
      .where(
        and(
          eq(exam_video_chunks.worker_exam_id, we.id),
          notDeleted(exam_video_chunks),
        ),
      );
    const existingPaths = new Set(existing.map((r) => r.path));

    const fresh = files.filter((p) => !existingPaths.has(p));
    if (fresh.length === 0) return;

    const rows = fresh.map((path) => ({
      worker_exam_id: we.id,
      exam_id: we.exam_id,
      path,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    }));
    await this.db.insert(exam_video_chunks).values(rows);
  }

  /**
   * GET /exam/results/worker-exam-videos/:workerExamId — Laravel
   * ExamVideoService::show. Chunk yo'llarini signed fileUrl ko'rinishida qaytaradi.
   * (SoftDeletes model → o'chirilganlar avtomatik chiqmaydi; orderBy yo'q.)
   */
  async show(workerExamId: number): Promise<(string | null)[]> {
    const rows = await this.db
      .select({ path: exam_video_chunks.path })
      .from(exam_video_chunks)
      .where(
        and(
          eq(exam_video_chunks.worker_exam_id, workerExamId),
          notDeleted(exam_video_chunks),
        ),
      );
    return Promise.all(rows.map((r) => this.minio.fileUrl(r.path)));
  }

  // exam_video_chunks SoftDeletes — kelajakda o'chirish uchun yordamchi.
  // (Hozircha Laravel'da delete endpoint yo'q.)
  async softDelete(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.db
      .update(exam_video_chunks)
      .set({ deleted_at: sql`NOW()` })
      .where(inArray(exam_video_chunks.id, ids));
  }
}
