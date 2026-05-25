// WorkerMilitary service. MilitaryStatusEnum 1..3.
//
// Laravel bug: `'status' => ['id' => $this->id, 'name' => ...]` — `status.id` field aslida
// row.id (controller pattern xato). Parity uchun shu xato'ni saqlaymiz.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_military_services } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerMilitaryDto,
  UpdateWorkerMilitaryDto,
  WorkerMilitaryItemDto,
} from '@/modules/hr/worker-militaries/dto/worker-military.dto';

const MILITARY_STATUS_KEYS: Record<number, string> = {
  1: 'messages.military_status.one',
  2: 'messages.military_status.two',
  3: 'messages.military_status.three',
};

@Injectable()
export class WorkerMilitaryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerMilitaryItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    const lang = this.ctx.lang;
    const rows = await this.db
      .select()
      .from(worker_military_services)
      .where(
        and(
          eq(worker_military_services.worker_id, workerId),
          notDeleted(worker_military_services),
        ),
      )
      .orderBy(asc(worker_military_services.id));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      speciality: r.speciality,
      // Laravel-bug parity — status.id aslida row.id (controller'da `'id' => $this->id`).
      status: {
        id: r.id,
        name: this.tr(MILITARY_STATUS_KEYS[r.status], lang),
      },
      commissariat: r.commissariat,
    }));
  }

  async create(dto: CreateWorkerMilitaryDto): Promise<void> {
    // Laravel: Helper::idUuid($uuid) — worker uuid → id.
    const workerId = await this.lookup.toId(dto.uuid);
    if (workerId == null) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }
    await this.db.insert(worker_military_services).values({
      worker_id: workerId,
      name: dto.name ?? null,
      number: dto.number ?? null,
      speciality: dto.speciality ?? null,
      status: dto.status,
      commissariat: dto.commissariat ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerMilitaryDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_military_services)
      .set({
        name: dto.name ?? null,
        number: dto.number ?? null,
        speciality: dto.speciality ?? null,
        status: dto.status,
        commissariat: dto.commissariat ?? null,
      })
      .where(eq(worker_military_services.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_military_services)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_military_services.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_military_services.id })
      .from(worker_military_services)
      .where(
        and(
          eq(worker_military_services.id, id),
          notDeleted(worker_military_services),
        ),
      )
      .limit(1);
    if (!row)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }
}
