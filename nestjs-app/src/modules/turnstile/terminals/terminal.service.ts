// Terminal service. Laravel: Turnstile/TerminalController.

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildings, terminals } from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  CreateTerminalDto,
  QueryTerminalDto,
  UpdateTerminalDto,
} from '@/modules/turnstile/terminals/dto/terminal.dto';

@Injectable()
export class TerminalService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: QueryTerminalDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      notDeleted(terminals),
      q.search ? ilike(terminals.name, `%${q.search}%`) : sql`TRUE`,
    );
    // Laravel TerminalController: no explicit orderBy — relies on Postgres heap-scan
    // order. To match parity, we also omit orderBy here.
    // TerminalResource: {id, building, name, name_ru, name_en, ip_address, url}.
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: terminals.id,
          building_id: terminals.building_id,
          name: terminals.name,
          name_ru: terminals.name_ru,
          name_en: terminals.name_en,
          ip_address: terminals.ip_address,
          url: terminals.url,
        })
        .from(terminals)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(terminals).where(where),
    ]);

    // batch-attach building info (Laravel: BuildingResource — only {id, name, name_ru, name_en}).
    const bIds = [...new Set(rows.map((r) => r.building_id).filter(Boolean))];
    const bRows = bIds.length
      ? await this.db
          .select({
            id: buildings.id,
            name: buildings.name,
            name_ru: buildings.name_ru,
            name_en: buildings.name_en,
          })
          .from(buildings)
          .where(inArray(buildings.id, bIds))
      : [];
    const bMap = new Map<number, (typeof bRows)[number]>(
      bRows.map((b) => [b.id, b] as const),
    );
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      // TerminalResource field order: id, building, name, name_ru, name_en, ip_address, url.
      data: rows.map((r) => ({
        id: r.id,
        building: bMap.get(r.building_id) ?? null,
        name: r.name,
        name_ru: r.name_ru,
        name_en: r.name_en,
        ip_address: r.ip_address,
        url: r.url,
      })),
    };
  }

  async create(dto: CreateTerminalDto) {
    const id = await nextId(this.db, terminals);
    await this.db.insert(terminals).values({
      id,
      building_id: dto.building_id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      ip_address: dto.ip_address,
      server_ip: dto.server_ip ?? null,
      url: dto.url ?? null,
      type: dto.type ?? false,
    });
  }

  async update(id: number, dto: UpdateTerminalDto) {
    const [row] = await this.db
      .select({ id: terminals.id })
      .from(terminals)
      .where(eq(terminals.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.building_id !== undefined) data.building_id = dto.building_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.name_ru !== undefined) data.name_ru = dto.name_ru;
    if (dto.name_en !== undefined) data.name_en = dto.name_en;
    if (dto.ip_address !== undefined) data.ip_address = dto.ip_address;
    if (dto.server_ip !== undefined) data.server_ip = dto.server_ip;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.type !== undefined) data.type = dto.type;
    await this.db.update(terminals).set(data).where(eq(terminals.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(terminals)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(terminals.id, id));
  }
}
