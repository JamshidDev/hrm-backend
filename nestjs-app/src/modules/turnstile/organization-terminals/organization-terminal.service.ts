// OrganizationTerminal service. Laravel: OrganizationTerminalController.

import { Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { organization_terminals, organizations, terminals } from '@/db/schema';
import { nextId } from '@/modules/turnstile/_shared/helpers';
import type { SyncOrganizationTerminalsDto } from '@/modules/turnstile/organization-terminals/dto/organization-terminal.dto';

@Injectable()
export class OrganizationTerminalService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: index — organizations with terminals_count, returned as toTree().
  // We return flat list (frontend may treeify by parent_id).
  async list() {
    const orgs = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        parent_id: organizations.parent_id,
      })
      .from(organizations)
      .where(notDeleted(organizations))
      .orderBy(organizations.id);
    const counts = await this.db
      .select({
        organization_id: organization_terminals.organization_id,
        total: count(),
      })
      .from(organization_terminals)
      .where(notDeleted(organization_terminals))
      .groupBy(organization_terminals.organization_id);
    const cMap = new Map<number, number>(
      counts.map((c) => [c.organization_id, Number(c.total)] as const),
    );
    return orgs.map((o) => ({ ...o, terminals_count: cMap.get(o.id) ?? 0 }));
  }

  // Laravel: TerminalMinimalResource — faqat {id, name}.
  async show(organizationId: number) {
    const rows = await this.db
      .select({
        id: terminals.id,
        name: terminals.name,
      })
      .from(organization_terminals)
      .innerJoin(terminals, eq(organization_terminals.terminal_id, terminals.id))
      .where(
        and(
          eq(organization_terminals.organization_id, organizationId),
          notDeleted(organization_terminals),
          notDeleted(terminals),
        ),
      );
    return rows;
  }

  // Laravel: sync(terminals) — remove old, insert new in bulk.
  async sync(dto: SyncOrganizationTerminalsDto) {
    await this.db
      .update(organization_terminals)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_terminals.organization_id, dto.organization_id));
    if (dto.terminals && dto.terminals.length > 0) {
      let baseId = await nextId(this.db, organization_terminals);
      const values = dto.terminals.map((tid) => ({
        id: baseId++,
        organization_id: dto.organization_id,
        terminal_id: tid,
      }));
      await this.db.insert(organization_terminals).values(values);
    }
  }

  async detachAll(organizationId: number) {
    await this.db
      .update(organization_terminals)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_terminals.organization_id, organizationId));
  }
}
