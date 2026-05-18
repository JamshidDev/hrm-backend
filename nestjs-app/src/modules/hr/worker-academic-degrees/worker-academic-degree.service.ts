// WorkerAcademicDegree service.
// AcademicDegreeEnum (1..4) i18n keys — service ichida.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_academic_degrees } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerAcademicDegreeDto,
  UpdateWorkerAcademicDegreeDto,
  WorkerAcademicDegreeItemDto,
} from '@/modules/hr/worker-academic-degrees/dto/worker-academic-degree.dto';

const ACADEMIC_DEGREE_KEYS: Record<number, string> = {
  1: 'messages.academic_degree.one',
  2: 'messages.academic_degree.two',
  3: 'messages.academic_degree.three',
  4: 'messages.academic_degree.four',
};

@Injectable()
export class WorkerAcademicDegreeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly lookup: WorkerUuidLookup,
    private readonly minio: MinioService,
  ) {}

  async findAll(uuid?: string): Promise<WorkerAcademicDegreeItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    const lang = this.ctx.lang;
    const rows = await this.db
      .select()
      .from(worker_academic_degrees)
      .where(
        and(
          eq(worker_academic_degrees.worker_id, workerId),
          notDeleted(worker_academic_degrees),
        ),
      )
      .orderBy(asc(worker_academic_degrees.id));

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        type: {
          id: r.type,
          name: this.tr(ACADEMIC_DEGREE_KEYS[r.type], lang),
        },
        file: await this.minio.fileUrl(r.file),
      })),
    );
  }

  async create(dto: CreateWorkerAcademicDegreeDto): Promise<void> {
    await this.db.insert(worker_academic_degrees).values({
      worker_id: dto.worker_id,
      type: dto.type,
      file: dto.file ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerAcademicDegreeDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_academic_degrees)
      .set({
        worker_id: dto.worker_id,
        type: dto.type,
        file: dto.file ?? null,
      })
      .where(eq(worker_academic_degrees.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_academic_degrees)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_academic_degrees.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_academic_degrees.id })
      .from(worker_academic_degrees)
      .where(
        and(
          eq(worker_academic_degrees.id, id),
          notDeleted(worker_academic_degrees),
        ),
      )
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }
}
