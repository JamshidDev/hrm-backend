// Useful service. Laravel: UsefulController.
// 2 endpoint: codex (static HTML), leaders (organization tree with leaders).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  organization_leaders,
  organizations,
  positions,
  worker_positions,
  workers,
} from '@/db/schema';

export interface LeaderItem {
  id: number;
  worker: {
    id: number;
    photo: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null;
  position_short_name: string;
  position_full_name: string;
  phones: unknown;
}

export interface OrgTreeNode {
  id: number;
  name: string | null;
  group: boolean;
  leaders: LeaderItem[];
  children: OrgTreeNode[];
}

@Injectable()
export class UsefulService {
  private readonly logger = new Logger(UsefulService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // Laravel UsefulController::codex — `file_get_contents('resumes/documents/codex.html')`.
  //
  // Static HTML asset (~1 MB). Laravel'da public dir'da. NestJS'da fayllar mavjud
  // bo'lmasa Laravel'ning public/resumes/documents'iga fallback (parallel-app deploy).
  async codex(lang?: string): Promise<{ codex: string }> {
    const localeRu =
      typeof lang === 'string' && lang.toLowerCase().startsWith('ru');
    const filename = localeRu ? 'codex_ru.html' : 'codex.html';

    // Search candidates (priority order): NestJS public → Laravel public.
    const candidates = [
      join(process.cwd(), 'public', 'resumes', 'documents', filename),
      // Laravel app sibling fallback. Both apps usually deployed side-by-side
      // under hrm-backend/. Resolve from NestJS root one level up + laravel-app.
      join(
        process.cwd(),
        '..',
        'laravel-app',
        'public',
        'resumes',
        'documents',
        filename,
      ),
    ];

    for (const filePath of candidates) {
      try {
        const content = await readFile(filePath, 'utf-8');
        return { codex: content };
      } catch {
        // try next candidate
      }
    }
    this.logger.warn(`codex: ${filename} not found in any candidate path`);
    return { codex: '' };
  }

  // GET /api/v1/useful/leaders
  //
  // Laravel: UsefulController::leaders
  //   Organization::with(['leaders' => fn $q => $q->whereHas('worker_position'),
  //     'leaders.worker_position', 'leaders.worker_position.department',
  //     'leaders.worker_position.worker'])
  //   ->search()->get()->toTree();
  //
  // Response (tree):
  //   [{ id, name, group, leaders: [...], children: [{...recursive}] }]
  // LeadersResource: { id, worker:{id,photo,last,first,middle}, position_short_name,
  //                   position_full_name, phones }
  async leaders(): Promise<OrgTreeNode[]> {
    // 1) Flat orgs (active).
    const orgRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        group: organizations.group,
        parent_id: organizations.parent_id,
        lft: organizations._lft,
      })
      .from(organizations)
      .where(isNull(organizations.deleted_at))
      .orderBy(asc(organizations._lft));

    // 2) Leaders joinlari. Laravel: whereHas('worker_position') — bo'lmasa skip.
    const leaderRows = await this.db
      .select({
        id: organization_leaders.id,
        organization_id: organization_leaders.organization_id,
        worker_position_id: organization_leaders.worker_position_id,
        phones: organization_leaders.phones,
        worker_id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        photo: workers.photo,
        position_name: positions.name,
        department_name: departments.name,
        department_level: departments.level,
        org_full_name: organizations.full_name,
      })
      .from(organization_leaders)
      .innerJoin(
        worker_positions,
        eq(worker_positions.id, organization_leaders.worker_position_id),
      )
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(positions, eq(positions.id, worker_positions.position_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .where(isNull(organization_leaders.deleted_at));

    // Photo URL'larni parallel olib kelish.
    const photoUrls = await Promise.all(
      leaderRows.map((l) => this.minio.fileUrl(l.photo)),
    );

    // Group leaders by organization_id.
    const leadersByOrg = new Map<number, LeaderItem[]>();
    for (let i = 0; i < leaderRows.length; i++) {
      const l = leaderRows[i];
      const orgId = Number(l.organization_id);
      const arr = leadersByOrg.get(orgId) ?? [];
      const short = getShortPos(l.department_name, l.department_level, l.position_name);
      const full = getFullPos(l.org_full_name, l.department_name, l.department_level, l.position_name);
      arr.push({
        id: Number(l.id),
        worker: l.worker_id
          ? {
              id: Number(l.worker_id),
              photo: photoUrls[i],
              last_name: l.last_name,
              first_name: l.first_name,
              middle_name: l.middle_name,
            }
          : null,
        position_short_name: short,
        position_full_name: full,
        phones: l.phones,
      });
      leadersByOrg.set(orgId, arr);
    }

    // 3) Build tree via parent_id.
    const allNodes = new Map<number, OrgTreeNode>();
    for (const o of orgRows) {
      allNodes.set(Number(o.id), {
        id: Number(o.id),
        name: o.name,
        group: Boolean(o.group),
        leaders: leadersByOrg.get(Number(o.id)) ?? [],
        children: [],
      });
    }
    const roots: OrgTreeNode[] = [];
    for (const o of orgRows) {
      const node = allNodes.get(Number(o.id))!;
      if (o.parent_id == null) {
        roots.push(node);
      } else {
        const parent = allNodes.get(Number(o.parent_id));
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    return roots;
  }
}

// Laravel PositionHelper::getShortPosition — dept + position (CENTER_LEVEL=1 → just position).
function getShortPos(
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  if (deptLevel === 1 || !deptName) return posName;
  return `${deptName} ${posName}`.trim();
}

// Laravel PositionHelper::getFullPosition — org full + dept + position.
function getFullPos(
  orgFull: string | null,
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  const parts: string[] = [];
  if (orgFull) parts.push(orgFull);
  if (deptName && deptLevel !== 1) parts.push(deptName);
  parts.push(posName);
  return parts.join(' ').trim();
}
