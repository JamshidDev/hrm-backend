// WorkerParty service. PartyEnum 2..5 i18n keys.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_parties } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerPartyDto,
  UpdateWorkerPartyDto,
  WorkerPartyItemDto,
} from '@/modules/hr/worker-parties/dto/worker-party.dto';

// PartyEnum (2..5) — Laravel: messages.worker.political_party.{two..five}.
// NestJS'da `political_party` alohida namespace ostida.
const PARTY_KEYS: Record<number, string> = {
  2: 'messages.political_party.two',
  3: 'messages.political_party.three',
  4: 'messages.political_party.four',
  5: 'messages.political_party.five',
};

@Injectable()
export class WorkerPartyService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerPartyItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    const lang = this.ctx.lang;
    const rows = await this.db
      .select({
        id: worker_parties.id,
        party: worker_parties.party,
        from_date: worker_parties.from_date,
        to_date: worker_parties.to_date,
      })
      .from(worker_parties)
      .where(
        and(eq(worker_parties.worker_id, workerId), notDeleted(worker_parties)),
      )
      .orderBy(asc(worker_parties.id));
    return rows.map((r) => ({
      id: r.id,
      party: {
        id: r.party,
        name: this.tr(PARTY_KEYS[r.party], lang),
      },
      from_date: r.from_date,
      to_date: r.to_date,
    }));
  }

  async create(dto: CreateWorkerPartyDto): Promise<void> {
    // Laravel: Helper::idUuid($uuid) — worker uuid → id.
    const workerId = await this.lookup.toId(dto.uuid);
    if (workerId == null) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }
    await this.db.insert(worker_parties).values({
      worker_id: workerId,
      party: dto.party,
      from_date: dto.from_date,
      to_date: dto.to_date ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerPartyDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_parties)
      .set({
        party: dto.party,
        from_date: dto.from_date,
        to_date: dto.to_date ?? null,
      })
      .where(eq(worker_parties.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_parties)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_parties.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_parties.id })
      .from(worker_parties)
      .where(and(eq(worker_parties.id, id), notDeleted(worker_parties)))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }
}
