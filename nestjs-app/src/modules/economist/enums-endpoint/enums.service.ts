// Economist enums service. Laravel: EconomistController->enums + structure.
// Frontend dropdownlari + tashkilot daraxti uchun.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import {
  organizations,
  economist_uploads,
  organization_economist_uploads,
} from '@/db/schema';
import { getCodeNamesOrdered } from '@/modules/economist/_shared/code-names';
import { getUploadDeadline } from '@/modules/economist/_shared/code-groups';

// Laravel UploadTypeEnum (ONE=1..FOUR=4) + i18n kalit so'zlari.
const UPLOAD_TYPES = [
  { value: 1, word: 'one' },
  { value: 2, word: 'two' },
  { value: 3, word: 'three' },
  { value: 4, word: 'four' },
] as const;

// Laravel UploadStatusEnum (PROCESS=1, RELOADED=2, SUCCESS=3, ERROR=4) + i18n kalit so'zlari.
const UPLOAD_STATUSES = [
  { value: 1, word: 'one' },
  { value: 2, word: 'two' },
  { value: 3, word: 'three' },
  { value: 4, word: 'four' },
] as const;
// Laravel UploadStatusEnum::SUCCESS = 3.
const UPLOAD_STATUS_SUCCESS = 3;

// StructureResource node shape.
interface StructUploadStat {
  id: number;
  type: string;
  uploaded_count: number;
  confirmed: boolean;
}
export interface StructNode {
  id: number;
  name: string;
  group: boolean | null;
  uploadStats: StructUploadStat[];
  children: StructNode[];
  uploadStatus: boolean;
}

@Injectable()
export class EconomistEnumsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  /**
   * GET /api/v1/economist/enums — Laravel parity.
   * Frontend uchun upload types, statuses, kodlar lug'ati (i18n bilan).
   */
  enums(lang?: string): {
    upload_types: Array<{ id: number; name: string }>;
    upload_statuses: Array<{ id: number; name: string }>;
    codes: string[][];
  } {
    const l = lang ?? this.ctx.lang;
    // Laravel UploadTypeEnum::list() / UploadStatusEnum::list() → [{id, name}]
    // (name = i18n label). codes = StatementCodeDictionaryService::names() (til bo'yicha).
    // codes — Laravel tartibidagi [code, name] juftliklari (controller qo'lda
    // serialize qiladi — JS object integer-key tartibini buzmasin).
    return {
      upload_types: UPLOAD_TYPES.map((t) => ({
        id: t.value,
        name: this.i18n.t(`messages.economist.upload_types.${t.word}`, {
          lang: l,
        }),
      })),
      upload_statuses: UPLOAD_STATUSES.map((s) => ({
        id: s.value,
        name: this.i18n.t(`messages.economist.upload_statuses.${s.word}`, {
          lang: l,
        }),
      })),
      codes: getCodeNamesOrdered(l),
    };
  }

  // GET /economist/structure — Laravel: EconomistService::structure +
  //   StructureResource::collectionWithDeadline. Rol-based org daraxti
  //   (admin → barcha, leader → subtree, default → o'zi), har tugun uchun
  //   uploadStats (4 tur) + uploadStatus (deadline logikasi bilan).
  async structure(q: { year?: number | string; month?: number | string }) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const lang = this.ctx.lang;
    const deadline = getUploadDeadline(year, month);
    const now = new Date();

    // Rol-based org scope (Laravel admin/leader/default → OrgScopeService.ids()).
    const scopeIds = await this.scope.ids();
    if (!scopeIds.length) return [];

    // Scope ichidagi tashkilotlar — NestedSet `_lft` tartibida (Laravel defaultOrder).
    const orgRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
        group: organizations.group,
        parent_id: organizations.parent_id,
      })
      .from(organizations)
      .where(
        and(notDeleted(organizations), inArray(organizations.id, scopeIds)),
      )
      .orderBy(asc(organizations._lft));

    const orgIds = orgRows.map((o) => o.id);

    // economistUploads (year+month) + uploadStatus (year+month) — batch.
    const [uploadRows, statusRows] = await Promise.all([
      orgIds.length
        ? this.db
            .select({
              organization_id: economist_uploads.organization_id,
              type: economist_uploads.type,
              status: economist_uploads.status,
            })
            .from(economist_uploads)
            .where(
              and(
                inArray(economist_uploads.organization_id, orgIds),
                eq(economist_uploads.year, year),
                eq(economist_uploads.month, month),
                notDeleted(economist_uploads),
              ),
            )
        : Promise.resolve(
            [] as Array<{
              organization_id: number | null;
              type: number | null;
              status: number | null;
            }>,
          ),
      orgIds.length
        ? this.db
            .select({
              organization_id: organization_economist_uploads.organization_id,
            })
            .from(organization_economist_uploads)
            .where(
              and(
                inArray(organization_economist_uploads.organization_id, orgIds),
                eq(organization_economist_uploads.year, year),
                eq(organization_economist_uploads.month, month),
                notDeleted(organization_economist_uploads),
              ),
            )
        : Promise.resolve([] as Array<{ organization_id: number | null }>),
    ]);

    // org → uploads, va status mavjud org'lar to'plami.
    const uploadsByOrg = new Map<number, typeof uploadRows>();
    for (const u of uploadRows) {
      if (u.organization_id == null) continue;
      if (!uploadsByOrg.has(u.organization_id)) {
        uploadsByOrg.set(u.organization_id, []);
      }
      uploadsByOrg.get(u.organization_id)!.push(u);
    }
    const hasStatus = new Set<number>();
    for (const s of statusRows) {
      if (s.organization_id != null) hasStatus.add(s.organization_id);
    }

    const pastDeadline = now.getTime() > deadline.getTime();

    // Daraxt: orgRows `_lft` tartibida → root'lar (parent yo'q yoki scope tashqarisida)
    // va bolalar shu tartibni saqlaydi (Laravel toTree).
    const idSet = new Set(orgIds);
    const childrenMap = new Map<number, typeof orgRows>();
    const roots: typeof orgRows = [];
    for (const o of orgRows) {
      if (o.parent_id == null || !idSet.has(o.parent_id)) {
        roots.push(o);
      } else {
        if (!childrenMap.has(o.parent_id)) childrenMap.set(o.parent_id, []);
        childrenMap.get(o.parent_id)!.push(o);
      }
    }

    // StructureResource::getUploadStatsList — 4 tur (UploadTypeEnum).
    const buildStats = (orgId: number): StructUploadStat[] => {
      const ups = uploadsByOrg.get(orgId) ?? [];
      return UPLOAD_TYPES.map((t) => {
        const typeUps = ups.filter((u) => Number(u.type) === t.value);
        return {
          id: t.value,
          type: this.i18n.t(`messages.economist.upload_types.${t.word}`, {
            lang,
          }),
          uploaded_count: typeUps.length,
          confirmed: typeUps.some(
            (u) => Number(u.status) === UPLOAD_STATUS_SUCCESS,
          ),
        };
      });
    };

    const build = (node: (typeof orgRows)[number]): StructNode => ({
      id: node.id,
      name: `${node.name ?? ''} (${node.code ?? ''})`,
      group: node.group,
      uploadStats: buildStats(node.id),
      children: (childrenMap.get(node.id) ?? []).map(build),
      // Laravel: !uploadStatus && now > deadline → false; aks holda true.
      uploadStatus: !hasStatus.has(node.id) && pastDeadline ? false : true,
    });

    return roots.map(build);
  }
}
