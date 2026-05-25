// Eksport vazifalari uchun umumiy runner. Laravel: UserExportTask + *ExportToExcelJob.
//
// Har bir eksport moduli (vacations, incentives, ...) faqat o'ziga xos qismni —
// { type, folder, build } — beradi. Task yaratish, fonda Excel generatsiya,
// MinIO'ga yuklash va status (1→2/3) yangilash shu yerda markazlashtirilgan,
// shuning uchun har modulda qayta yozilmaydi.

import { Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { user_export_tasks } from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// user_export_tasks.status: 1=jarayonda, 2=tayyor, 3=xato.
const STATUS_IN_PROGRESS = 1;
const STATUS_DONE = 2;
const STATUS_ERROR = 3;

export interface ExportTaskOptions {
  // ExportTaskEnum qiymati (masalan 26=vacation_workers, 28=incentive).
  type: number;
  // MinIO papka nomi: tasks/export/{folder}/{md5(taskId)}.{ext}.
  folder: string;
  // Modulga xos qism: ma'lumotni olib, file buffer qaytaradi.
  build: () => Promise<Buffer>;
  // Fayl kengaytmasi (default: xlsx).
  ext?: string;
  // MIME (default: XLSX MIME).
  contentType?: string;
  // To'liq yo'lni o'zi yasash uchun (Laravel: zip → `tasks/zip/{n}.zip`).
  keyBuilder?: (taskId: number) => string;
}

@Injectable()
export class ExportTaskRunner {
  private readonly logger = new Logger(ExportTaskRunner.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // Eksport vazifasini yaratadi va Excel'ni fon rejimida tayyorlaydi.
  // So'rovni bloklamaydi — controller darhol "navbatga qo'shildi" javobini beradi.
  async run(opts: ExportTaskOptions): Promise<void> {
    const [task] = await this.db
      .insert(user_export_tasks)
      .values({
        user_id: this.ctx.user_or_fail.id,
        type: opts.type,
        status: STATUS_IN_PROGRESS,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning({ id: user_export_tasks.id });

    void this.generate(task.id, opts);
  }

  // Buffer'ni tayyorlab MinIO'ga yuklaydi va task statusini yangilaydi.
  private async generate(
    taskId: number,
    opts: ExportTaskOptions,
  ): Promise<void> {
    try {
      const buffer = await opts.build();
      const ext = opts.ext ?? 'xlsx';
      const contentType = opts.contentType ?? XLSX_MIME;
      // Laravel: 'tasks/export/{folder}/' . md5($task->id) . '.{ext}' (default)
      // yoki keyBuilder bilan to'liq override.
      const key =
        opts.keyBuilder?.(taskId) ??
        `tasks/export/${opts.folder}/${createHash('md5')
          .update(String(taskId))
          .digest('hex')}.${ext}`;
      await this.minio.putObject(key, buffer, contentType);
      await this.db
        .update(user_export_tasks)
        .set({ file: key, status: STATUS_DONE, updated_at: sql`NOW()` })
        .where(eq(user_export_tasks.id, taskId));
    } catch (err) {
      this.logger.error(`Export task ${taskId} failed`, err as Error);
      await this.db
        .update(user_export_tasks)
        .set({
          status: STATUS_ERROR,
          message: err instanceof Error ? err.message : String(err),
          updated_at: sql`NOW()`,
        })
        .where(eq(user_export_tasks.id, taskId));
    }
  }
}
