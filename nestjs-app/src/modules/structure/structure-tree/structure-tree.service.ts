// Structure tree views. Laravel: StructureController::index/all/parents/...
//
// Hozirgi qamrov:
//   - all      — barcha organizations tree (OrganizationChildResource recursive).
//   - parents  — user.organization_id ancestorsAndSelf chain (OrganizationListResource).
//
// Skip (HR modul kerak): index, leaders, parent-leaders, confirmations.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  between,
  eq,
  gt,
  ilike,
  lt,
  or,
  type SQL,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { PermissionService } from '@/shared/permission/permission.service';

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
    private readonly permissions: PermissionService,
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

  /**
   * Laravel: StructureController::index() — `/api/v1/structure`.
   * Logic:
   *   - matchingNodes = Organization::query()->search()->when(organization_id)
   *   - if user has 'organization-admin' permission → admin tree
   *   - elseif 'organization-leader' → leader tree
   *   - else → user's own organization
   *
   * NestJS hozircha PermissionGuard yo'q — admin path (full tree) ishlatamiz va
   * `organization_id` filter va `search` query'sini qo'llaymiz. Search/filter
   * matching parent zanjirini ham qaytarish — getAll() bilan o'xshash full tree.
   */
  async index(
    search?: string,
    organizationId?: number,
  ): Promise<OrgTreeNode[]> {
    const lang = this.ctx.lang;
    const user = this.ctx.user;
    const userId = user?.id;
    const userOrgId = user?.organization_id;
    if (!userId || !userOrgId) return [];

    // Step 1 — matching nodes (Laravel: search + when organization_id).
    const matchConds: SQL[] = [notDeleted(organizations)];
    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      const searchOr = or(
        ilike(organizations.name, pattern),
        ilike(organizations.full_name, pattern),
        ilike(organizations.name_ru, pattern),
        ilike(organizations.code, pattern),
      );
      if (searchOr) matchConds.push(searchOr);
    }
    if (organizationId) {
      matchConds.push(eq(organizations.id, organizationId));
    }

    const matchingNodes = await this.db
      .select({
        id: organizations.id,
        _lft: organizations._lft,
        _rgt: organizations._rgt,
      })
      .from(organizations)
      .where(and(...matchConds));

    // Step 2 — user permission tekshiruvi.
    const perms = await this.permissions.getUserPermissions(userId);
    const isAdmin = perms.has('organization-admin');
    const isLeader = !isAdmin && perms.has('organization-leader');

    // Step 3 — scope WHERE shakllantirish.
    let scopeWhere: SQL | undefined;

    if (isAdmin) {
      // Laravel scopeAdminOrganizations: subtree (between _lft..._rgt) OR ancestors.
      if (matchingNodes.length === 0) {
        return [];
      }
      const orParts: SQL[] = [];
      for (const node of matchingNodes) {
        const subtree = between(organizations._lft, node._lft, node._rgt);
        const ancestor = and(
          lt(organizations._lft, node._lft),
          gt(organizations._rgt, node._rgt),
        );
        const oneOr = or(subtree, ancestor);
        if (oneOr) orParts.push(oneOr);
      }
      scopeWhere = or(...orParts);
    } else if (isLeader) {
      // Laravel scopeLeaderOrganizations: descendantsAndSelf(user.org)
      // intersect matching → _lft BETWEEN max(node._lft - 1, userLft) AND node._rgt.
      const [userOrg] = await this.db
        .select({
          _lft: organizations._lft,
          _rgt: organizations._rgt,
        })
        .from(organizations)
        .where(eq(organizations.id, userOrgId))
        .limit(1);
      if (!userOrg) return [];

      // descendantsAndSelf(user.org) ∩ matching → filter matchingNodes ichida.
      const descendants = matchingNodes.filter(
        (n) => n._lft >= userOrg._lft && n._rgt <= userOrg._rgt,
      );
      if (descendants.length === 0) return [];

      const orParts: SQL[] = [];
      for (const node of descendants) {
        const lower = Math.max(node._lft - 1, userOrg._lft);
        orParts.push(between(organizations._lft, lower, node._rgt));
      }
      scopeWhere = or(...orParts);
    } else {
      // Default: faqat user'ning o'z organization'i.
      scopeWhere = eq(organizations.id, userOrgId);
    }

    const where = and(notDeleted(organizations), scopeWhere);
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
      .where(where)
      .orderBy(asc(organizations._lft));

    return this.buildTree(flat, lang);
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

}
