// Structure tree views. Laravel: StructureController::index/all/parents/confirmations/parentLeaders.
//
// Qamrov:
//   - index          — `/structure` (rol-asosli org tree: admin/leader/own).
//   - all            — barcha organizations tree (OrganizationChildResource recursive).
//   - parents        — user.organization_id ancestorsAndSelf chain (OrganizationListResource).
//   - confirmations  — lead-lavozim worker_position'lar (org-scopesiz), WorkerPositionMinimalResource.
//   - parentLeaders  — lead-lavozim worker_position'lar ∈ ancestorsAndSelf(user org).

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  between,
  count,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  organizations,
  worker_positions,
  workers,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { PermissionService } from '@/shared/permission/permission.service';
import { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';

// Laravel App\Helpers\Helper::leadPositionIds() — [$leadIds, $leadDeputyIds].
// confirmations faqat $leadIds (rahbar lavozimlari) ishlatadi.
const LEAD_POSITION_IDS = [
  84, 399, 934, 144, 171, 232, 1546, 21, 8, 12, 16, 218, 437, 499, 822, 1503,
];

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
    private readonly minio: MinioService,
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

  /**
   * Laravel: StructureController::confirmations() — `/api/v1/structure/confirmations`.
   *
   * WorkerPosition::whereIn('position_id', $leadIds)   // Helper::leadPositionIds()[0]
   *   ->with([worker, organization, department, position])
   *   ->paginate(per_page ?? 50)
   *   → PaginateResource(WorkerPositionMinimalResource).
   *
   * Diqqat: Laravel `organization_id` query'sini E'TIBORGA OLMAYDI (filter yo'q) —
   * faqat lead lavozimdagi barcha worker_position'lar (org-scopesiz). Parity uchun
   * NestJS ham organization_id'ni e'tiborsiz qoldiradi.
   */
  async confirmations(perPage?: number, page?: number) {
    return this.listLeadPositions(perPage ?? 50, page ?? 1);
  }

  /**
   * Laravel: StructureController::parentLeaders — `/api/v1/structure/parent-leaders`.
   *
   * $orgIds = Organization::ancestorsAndSelf($user->organization_id)->select('id');
   * WorkerPosition::whereIn('position_id', $leadIds)->whereIn('organization_id', $orgIds)
   *   ->with([worker, organization, department, position])->paginate(per_page ?? 50)
   *   → PaginateResource(WorkerPositionMinimalResource).
   *
   * Diqqat: Laravel `organization_id`/`parent_id` query'sini E'TIBORGA OLMAYDI — org-scope
   * AUTH foydalanuvchining organization_id ancestorsAndSelf (ajdodlar + o'zi) zanjiri bo'yicha.
   */
  async parentLeaders(perPage?: number, page?: number) {
    const orgId = this.ctx.user?.organization_id;
    if (!orgId) return { current_page: page ?? 1, total: 0, data: [] };
    const orgIds = await this.getAncestorAndSelfOrgIds(orgId);
    return this.listLeadPositions(perPage ?? 50, page ?? 1, orgIds);
  }

  // ancestorsAndSelf(orgId) — NestedSet: ajdodlar + o'zi (_lft <= node._lft AND _rgt >= node._rgt).
  private async getAncestorAndSelfOrgIds(orgId: number): Promise<number[]> {
    const [node] = await this.db
      .select({ _lft: organizations._lft, _rgt: organizations._rgt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!node) return [];
    const rows = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          notDeleted(organizations),
          lte(organizations._lft, node._lft),
          gte(organizations._rgt, node._rgt),
        ),
      );
    return rows.map((r) => r.id);
  }

  /**
   * Lead-position worker_positions — `confirmations` (org-scopesiz) va `parent-leaders`
   * (ancestorsAndSelf org-scope) uchun umumiy. WorkerPositionMinimalResource shape, paginate(50).
   */
  private async listLeadPositions(
    perPage: number,
    page: number,
    orgIds?: number[],
  ) {
    const lang = this.ctx.lang;
    const pp = perPage;
    const pg = page;
    const offset = (pg - 1) * pp;

    if (orgIds && orgIds.length === 0) {
      return { current_page: pg, total: 0, data: [] };
    }

    // WorkerPosition SoftDeletes — default scope deleted'larni chiqarib tashlaydi.
    const where = and(
      notDeleted(worker_positions),
      inArray(worker_positions.position_id, LEAD_POSITION_IDS),
      orgIds ? inArray(worker_positions.organization_id, orgIds) : undefined,
    );

    // Laravel paginate() — count-first.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      return { current_page: pg, total: 0, data: [] };
    }

    // Laravel index'da orderBy yo'q → natural Postgres tartibi.
    const rows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        org_full_name: organizations.full_name,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(
        workers,
        and(
          eq(workers.id, worker_positions.worker_id),
          isNull(workers.deleted_at),
        ),
      )
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(where)
      .limit(pp)
      .offset(offset);

    // Laravel HR\Transformers\WorkerPosition\WorkerPositionMinimalResource:
    // {id, worker(WorkerMinimalResource), organization(OrganizationListResource),
    //  post_name, post_short_name}.
    const data = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              photo: await this.minio.fileUrl(r.worker_photo),
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
            }
          : null,
        organization: r.org_id
          ? {
              id: r.org_id,
              // OrganizationListResource: ru→name_ru, en→name_en, default→name (fallback YO'Q).
              name:
                lang === 'ru'
                  ? r.org_name_ru
                  : lang === 'en'
                    ? r.org_name_en
                    : r.org_name,
              group: r.org_group ?? false,
            }
          : null,
        post_name: getFullPosition({
          position_name: r.pos_name,
          department_name: r.dept_name,
          department_level: r.dept_level,
          organization_full_name: r.org_full_name,
        }),
        post_short_name: getShortPosition({
          position_name: r.pos_name,
          department_name: r.dept_name,
          department_level: r.dept_level,
          organization_full_name: r.org_full_name,
        }),
      })),
    );

    return { current_page: pg, total: totalNum, data };
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
    // parent_id chain bo'yicha tree.
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
