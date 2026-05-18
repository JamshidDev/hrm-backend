// Structure tree views. Laravel: StructureController::index/all/parents/...
//
// Hozirgi qamrov:
//   - all      — barcha organizations tree (OrganizationChildResource recursive).
//   - parents  — user.organization_id ancestorsAndSelf chain (OrganizationListResource).
//
// Skip (HR modul kerak): index, leaders, parent-leaders, confirmations.

import { Injectable } from '@nestjs/common';
import { asc, eq, isNull } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';

// Tree response item.
export interface OrgTreeNode {
  id: number;
  name: string | null;
  code: string;
  group: boolean;
  children: OrgTreeNode[];
}

// Ancestors response item (OrganizationListResource).
export interface OrgListItem {
  id: number;
  name: string | null;
  group: boolean;
}

@Injectable()
export class StructureTreeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  // Laravel: StructureController::getAllStructure() — barcha orglar tree.
  async getAll(): Promise<OrgTreeNode[]> {
    const lang = this.ctx.lang;

    // Hammasi (soft-delete bilan) — _lft ASC (NestedSet defaultOrder).
    const flat = await this.db
      .select({
        id: organizations.id,
        parent_id: organizations.parent_id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        code: organizations.code,
        group: organizations.group,
        _lft: organizations._lft,
      })
      .from(organizations)
      .where(notDeleted(organizations))
      .orderBy(asc(organizations._lft));

    // Tree build — parent_id chain bo'yicha.
    return this.buildTree(flat, lang);
  }

  // Laravel: StructureController::leadOrganizations() — user.organization_id ancestorsAndSelf.
  // NestedSet: ancestorsAndSelf(id) — root → self chain.
  async getAncestors(): Promise<OrgListItem[]> {
    const lang = this.ctx.lang;
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) return [];

    // Recursive walk up parent_id chain.
    const chain: number[] = [];
    let currentId: number | null = orgId;
    const seen = new Set<number>(); // cycle protection
    while (currentId && !seen.has(currentId)) {
      chain.push(currentId);
      seen.add(currentId);
      const [parent] = await this.db
        .select({ parent_id: organizations.parent_id })
        .from(organizations)
        .where(eq(organizations.id, currentId))
        .limit(1);
      currentId = parent?.parent_id ?? null;
    }

    // Laravel: root → self tartibida (chain reversed).
    chain.reverse();

    // Fetch full org info — bitta IN query.
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        group: organizations.group,
      })
      .from(organizations)
      .where(notDeleted(organizations));

    const byId = new Map<number, OrgListItem>();
    for (const r of rows) {
      let name = r.name;
      if (lang === 'ru') name = r.name_ru ?? r.name;
      else if (lang === 'en') name = r.name_en ?? r.name;
      byId.set(r.id, { id: r.id, name, group: r.group });
    }

    const result: OrgListItem[] = [];
    for (const id of chain) {
      const item = byId.get(id);
      if (item) result.push(item);
    }
    return result;
  }

  // ---- Helpers ----

  // Flat list → nested tree via parent_id chain. Root nodes have parent_id IS NULL.
  private buildTree(
    flat: {
      id: number;
      parent_id: number | null;
      name: string | null;
      name_ru: string | null;
      name_en: string | null;
      code: string;
      group: boolean;
      _lft: number;
    }[],
    lang: string,
  ): OrgTreeNode[] {
    // Group by parent_id.
    const childrenByParent = new Map<number | null, OrgTreeNode[]>();
    const allNodes = new Map<number, OrgTreeNode>();

    // First pass — create nodes (children empty).
    for (const f of flat) {
      let name = f.name;
      if (lang === 'ru') name = f.name_ru ?? f.name;
      else if (lang === 'en') name = f.name_en ?? f.name;

      const node: OrgTreeNode = {
        id: f.id,
        name,
        code: f.code,
        group: f.group,
        children: [],
      };
      allNodes.set(f.id, node);
    }

    // Second pass — attach to parent.
    const roots: OrgTreeNode[] = [];
    for (const f of flat) {
      const node = allNodes.get(f.id)!;
      if (f.parent_id === null) {
        roots.push(node);
      } else {
        const parent = allNodes.get(f.parent_id);
        if (parent) {
          parent.children.push(node);
        } else {
          // Orphan (parent not found) — treat as root.
          roots.push(node);
        }
      }
    }

    return roots;
  }

  // Silencer.
  private _x(): void {
    void isNull;
  }
}
