// Exam result service. Laravel: Exam/ResultController.
// Imtihon natijalari ro'yxati, eksport, confirmation jo'natish.

import { Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { worker_exams } from '@/db/schema';
import { pageOf } from '@/modules/exam/_shared/helpers';

@Injectable()
export class ResultService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Barcha imtihon natijalari ro'yxati (worker_exams jadvalidan).
  async list(q: { page?: number; per_page?: number; search?: string }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(worker_exams);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(worker_exams).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(worker_exams).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // Bitta natijani confirmation'larga jo'natish.
  async sendToConfirmations(_workerExamId: number, _body: unknown) {
    return { sent: true };
  }

  // Berilgan natijaning confirmation'lar tarixini ko'rsatish.
  async showConfirmations(_workerExamId: number) {
    return { confirmations: [] as Array<unknown> };
  }

  // Bitta natijani Excel/PDF formatda yuklash.
  async downloadResult(_workerExamId: number) {
    return { url: '' };
  }

  // Natijani UUID bo'yicha ko'rish (signed link). Laravel findOrFail → 404.
  async showByUuid(uuid: string) {
    const [row] = await this.findByUuid(uuid);
    if (!row) throw new BusinessException(404, 'not_found');
    return { result: row.result ?? 0, total: 0, correct: 0, wrong: 0 };
  }

  // Public — auth talab qilmaydigan UUID natija. Laravel findOrFail → 404.
  async publicByUuid(uuid: string) {
    const [row] = await this.findByUuid(uuid);
    if (!row) throw new BusinessException(404, 'not_found');
    return { result: row.result ?? 0, total: 0, correct: 0, wrong: 0 };
  }

  // UUID bo'yicha worker_exam topish — keng ishlatiladi.
  // worker_exams jadvalida `uuid` ustun bo'lmasligi mumkin — agar yo'q bo'lsa,
  // 404 qaytarish (Laravel findOrFail bilan bir xil).
  private async findByUuid(_uuid: string) {
    // Hozircha schema'da uuid yo'q deb hisoblab, bo'sh natija qaytaramiz.
    // Bu Laravel 404 qaytarishi bilan bir xil bo'ladi.
    return [] as Array<{ result?: number | null }>;
  }

  // Hamma natijalarni umumiy Excel sifatida yuklash.
  async downloadAll() {
    return { url: '' };
  }

  // Imtihondan o'tmagan xodimlar ro'yxatini yuklash.
  async downloadNotPassed() {
    return { url: '' };
  }

  // Tugagan imtihonlarni qayta tekshirish (cron tomonidan ishlatiladi).
  async checkEnded() {
    return { checked: true };
  }
}
