// WorkerPassport service. File URL — MinIO orqali signed URL.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_passports } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerPassportDto,
  UpdateWorkerPassportDto,
  WorkerPassportItemDto,
} from '@/modules/hr/worker-passports/dto/worker-passport.dto';

@Injectable()
export class WorkerPassportService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
    private readonly minio: MinioService,
  ) {}

  async findAll(uuid?: string): Promise<WorkerPassportItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    // Laravel `when($worker_id, ...)` — agar uuid yo'q bo'lsa, filter qo'shilmaydi.
    const where = and(
      notDeleted(worker_passports),
      workerId != null ? eq(worker_passports.worker_id, workerId) : undefined,
    );

    const rows = await this.db
      .select({
        id: worker_passports.id,
        serial_number: worker_passports.serial_number,
        from_date: worker_passports.from_date,
        to_date: worker_passports.to_date,
        address: worker_passports.address,
        file: worker_passports.file,
      })
      .from(worker_passports)
      .where(where)
      .orderBy(asc(worker_passports.id));

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        serial_number: r.serial_number,
        from_date: r.from_date,
        to_date: r.to_date,
        address: r.address,
        file: await this.minio.fileUrl(r.file),
      })),
    );
  }

  async create(dto: CreateWorkerPassportDto): Promise<void> {
    await this.db.insert(worker_passports).values({
      worker_id: dto.worker_id,
      serial_number: dto.serial_number,
      from_date: dto.from_date ?? null,
      to_date: dto.to_date ?? null,
      address: dto.address ?? null,
      file: dto.file ?? null,
      current: dto.current ?? true,
    });
  }

  async update(id: number, dto: UpdateWorkerPassportDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_passports)
      .set({
        worker_id: dto.worker_id,
        serial_number: dto.serial_number,
        from_date: dto.from_date ?? null,
        to_date: dto.to_date ?? null,
        address: dto.address ?? null,
        file: dto.file ?? null,
        current: dto.current ?? true,
      })
      .where(eq(worker_passports.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_passports)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_passports.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_passports.id })
      .from(worker_passports)
      .where(and(eq(worker_passports.id, id), notDeleted(worker_passports)))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }
}
