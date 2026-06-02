// Staffing approve service. Laravel: Economist/StaffingApproveController + App\Services\Economist\DocumentReplace.
// Shtat jadvali tasdiqlash oqimi:
//   - approveList  → GET staffing/approve   (StaffingApprove.filter→ApproveIndexResource)
//   - generateView → GET staffing/generate  (DocumentReplace::changedPositions — shtat o'zgarishlari)
//   - generate     → POST staffing/generate (DocumentReplace::generate — hujjat + raqamli imzo)
//   - approveDestroy → DELETE staffing/approve/{id}

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  staffing_approves,
  department_positions,
  positions as positionsTable,
  organizations,
  departments,
  worker_positions,
  workers,
} from '@/db/schema';
import { numberFormat } from '@/modules/economist/_shared/helpers';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import { CONFIRMATION_STATUS_LABELS } from '@/modules/confirmation/confirmations/confirmations.types';
import {
  StaffingApproveListQueryDto,
  StaffingGenerateViewQueryDto,
} from '@/modules/economist/staffing/dto/staffing.dto';

// Laravel Modules\Economist\Enums\ChangedStatusEnum (1=CREATED, 2=UPDATED, 3=DELETED).
const CHANGED_STATUS_LABELS: Record<number, string> = {
  1: 'messages.economist.changed.change_statuses.created',
  2: 'messages.economist.changed.change_statuses.updated',
  3: 'messages.economist.changed.change_statuses.deleted',
};

// Modules\Confirmation\Enums\ConfirmationStatusEnum.
const CONFIRMATION_STATUS_SUCCESS = 3;
// department_positions.status — DocumentReplace ConfirmationStatusEnum::PROCESS ishlatadi.
const DEPARTMENT_POSITION_STATUS_PROCESS = 1;

// confirmatory (worker_position) join natijasi — WorkerPositionMinimalResource uchun.
interface ConfRow {
  id: number;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  org_full_name: string | null;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_name: string | null;
}

@Injectable()
export class StaffingService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  // i18n enum label — id => map kaliti => tarjima.
  private enumName(
    map: Record<number, string>,
    id: number | null | undefined,
    lang: string,
  ): string {
    const key = id != null ? map[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // Laravel OrganizationListResource: ru→name_ru, en→name_en, default→name (fallback YO'Q).
  private orgName(
    o: { name: string | null; name_ru: string | null; name_en: string | null },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.name_ru;
    if (lang === 'en') return o.name_en;
    return o.name;
  }

  /**
   * GET /api/v1/economist/staffing/approve — Laravel `StaffingApproveController::index`.
   *
   * StaffingApprove::filter($user, request()->all())   // role org-scope + organizations + organization_id
   *   ->with([organization, confirmatory.{worker,organization,department,position}])
   *   ->orderByDesc('id')->paginate(per_page ?? 10)
   *   → PaginateResource(ApproveIndexResource).
   *
   * ApproveIndexResource: {id, number, date, organization(OrganizationListResource),
   *   generate, confirmatory(WorkerPositionMinimalResource), confirmation:{id,name}}.
   */
  async approveList(q: StaffingApproveListQueryDto) {
    const lang = this.ctx.lang;
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    // Laravel filter($user, ...) — QueryHelper::filterByOrganizations.
    const inScope = await this.scope.whereOrg(
      staffing_approves.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );
    const where = and(notDeleted(staffing_approves), inScope);

    // Laravel paginate() — count-first; total=0 bo'lsa items query yo'q.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(staffing_approves)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    const rows = await this.db
      .select()
      .from(staffing_approves)
      .where(where)
      .orderBy(desc(staffing_approves.id))
      .limit(perPage)
      .offset(offset);

    // Batch: organization + confirmatory (worker_position minimal).
    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const confIds = [
      ...new Set(
        rows
          .map((r) => r.confirmatory_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [orgList, confList] = await Promise.all([
      orgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, orgIds))
        : [],
      confIds.length
        ? this.db
            .select({
              id: worker_positions.id,
              org_id: organizations.id,
              org_name: organizations.name,
              org_name_ru: organizations.name_ru,
              org_name_en: organizations.name_en,
              org_group: organizations.group,
              org_full_name: organizations.full_name,
              worker_id: workers.id,
              worker_photo: workers.photo,
              worker_last: workers.last_name,
              worker_first: workers.first_name,
              worker_middle: workers.middle_name,
              dept_name: departments.name,
              dept_level: departments.level,
              pos_name: positionsTable.name,
            })
            .from(worker_positions)
            .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
            .leftJoin(
              organizations,
              and(
                eq(organizations.id, worker_positions.organization_id),
                isNull(organizations.deleted_at),
              ),
            )
            .leftJoin(
              departments,
              eq(departments.id, worker_positions.department_id),
            )
            .leftJoin(
              positionsTable,
              eq(positionsTable.id, worker_positions.position_id),
            )
            .where(inArray(worker_positions.id, confIds))
        : [],
    ]);
    const orgMap = new Map(orgList.map((o) => [o.id, o] as const));
    const confMap = new Map<number, ConfRow>(
      confList.map((c): [number, ConfRow] => [c.id, c]),
    );

    // Laravel HR\Transformers\WorkerPosition\WorkerPositionMinimalResource.
    const buildConfirmatory = async (c: ConfRow | undefined) =>
      c
        ? {
            id: c.id,
            worker: c.worker_id
              ? {
                  id: c.worker_id,
                  photo: await this.minio.fileUrl(c.worker_photo),
                  last_name: c.worker_last,
                  first_name: c.worker_first,
                  middle_name: c.worker_middle,
                }
              : null,
            organization: c.org_id
              ? {
                  id: c.org_id,
                  name: this.orgName(
                    {
                      name: c.org_name,
                      name_ru: c.org_name_ru,
                      name_en: c.org_name_en,
                    },
                    lang,
                  ),
                  group: c.org_group ?? false,
                }
              : null,
            post_name: getFullPosition({
              position_name: c.pos_name,
              department_name: c.dept_name,
              department_level: c.dept_level,
              organization_full_name: c.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: c.pos_name,
              department_name: c.dept_name,
              department_level: c.dept_level,
              organization_full_name: c.org_full_name,
            }),
          }
        : null;

    const data = await Promise.all(
      rows.map(async (r) => {
        const org =
          r.organization_id != null
            ? (orgMap.get(r.organization_id) ?? null)
            : null;
        const confirmatory =
          r.confirmatory_id != null
            ? confMap.get(r.confirmatory_id)
            : undefined;
        return {
          id: r.id,
          number: r.number,
          date: r.date,
          organization: org
            ? {
                id: org.id,
                name: this.orgName(org, lang),
                group: org.group ?? false,
              }
            : null,
          generate: r.generate,
          confirmatory: await buildConfirmatory(confirmatory),
          confirmation: {
            id: r.confirmation,
            name: this.enumName(
              CONFIRMATION_STATUS_LABELS,
              r.confirmation,
              lang,
            ),
          },
        };
      }),
    );

    return { current_page: page, total: totalNum, data };
  }

  /**
   * GET /api/v1/economist/staffing/generate — Laravel `DocumentReplace::changedPositions`.
   *
   * Shtatlarni qayerda hisoblaydi: `department_positions` jadvalida `status = PROCESS` (1)
   * bo'lgan qatorlar = hali tasdiqlanmagan (jarayondagi) shtat o'zgarishlari. Ular
   * `changed_status` ustuni (CREATED/UPDATED/DELETED) bilan belgilanadi.
   *
   * organization_id = request('organization_id', user.organization_id). department bo'yicha
   * guruhlaydi va har lavozim uchun rate(/100), salary, amount(salary*rate), changed_status.
   */
  async generateView(q: StaffingGenerateViewQueryDto, depIds: number[] = []) {
    const lang = this.ctx.lang;
    // Laravel: request('organization_id', $user->organization_id).
    const orgId =
      q.organization_id != null
        ? Number(q.organization_id)
        : (this.ctx.user?.organization_id ?? null);

    const conds: SQL[] = [
      notDeleted(department_positions),
      eq(department_positions.status, DEPARTMENT_POSITION_STATUS_PROCESS),
    ];
    if (orgId != null)
      conds.push(eq(department_positions.organization_id, orgId));
    if (depIds.length) conds.push(inArray(department_positions.id, depIds));

    // Laravel ->get() — orderBy yo'q, natural Postgres tartibi (groupBy shu tartibni saqlaydi).
    const rows = await this.db
      .select({
        id: department_positions.id,
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        rate: department_positions.rate,
        group: department_positions.group,
        rank: department_positions.rank,
        salary: department_positions.salary,
        changed_status: department_positions.changed_status,
      })
      .from(department_positions)
      .where(and(...conds));

    if (!rows.length) return { positions: [] };

    // Batch: position nomlari + departmentlar (Laravel relation withTrashed → deleted_at filtersiz).
    const posIds = [
      ...new Set(
        rows.map((r) => r.position_id).filter((id): id is number => id != null),
      ),
    ];
    const depIdsAll = [
      ...new Set(
        rows
          .map((r) => r.department_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const [positionRows, departmentRows] = await Promise.all([
      posIds.length
        ? this.db
            .select({ id: positionsTable.id, name: positionsTable.name })
            .from(positionsTable)
            .where(inArray(positionsTable.id, posIds))
        : [],
      depIdsAll.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              parent_id: departments.parent_id,
            })
            .from(departments)
            .where(inArray(departments.id, depIdsAll))
        : [],
    ]);
    const posMap = new Map(positionRows.map((p) => [p.id, p.name] as const));
    const depMap = new Map(departmentRows.map((d) => [d.id, d] as const));

    // department_id bo'yicha guruhlash (qatorlar kelgan tartibda — Laravel groupBy parity).
    const grouped = new Map<number, typeof rows>();
    for (const r of rows) {
      const did = r.department_id ?? 0;
      const bucket = grouped.get(did);
      if (bucket) bucket.push(r);
      else grouped.set(did, [r]);
    }

    const positions = Array.from(grouped.entries()).map(([depId, ps]) => {
      const dep = depMap.get(depId);
      return {
        id: dep?.id ?? depId,
        parent_id: dep?.parent_id ?? null,
        name: dep?.name ?? null,
        positions: ps.map((p) => {
          // Laravel DepartmentPosition rate Attribute getter: $value / 100.
          const rate = (p.rate ?? 0) / 100;
          const salary = Number(p.salary ?? 0);
          return {
            id: p.id,
            name:
              p.position_id != null
                ? (posMap.get(p.position_id) ?? null)
                : null,
            rate,
            group: p.group,
            rank: p.rank,
            salary: numberFormat(salary, 2),
            amount: numberFormat(salary * rate, 2),
            changed_status: {
              id: p.changed_status,
              name: this.enumName(
                CHANGED_STATUS_LABELS,
                p.changed_status,
                lang,
              ),
            },
          };
        }),
      };
    });

    return { positions };
  }

  /**
   * POST /api/v1/economist/staffing/generate — Laravel `DocumentReplace::generate`.
   *
   * To'liq hujjat generatsiyasi (StaffingApprove yaratish + department_positions sync +
   * StaffingApproveConfirmation sync + Excel shablon → DOCX→PDF + raqamli imzo QR) — alohida
   * og'ir quyi-tizim (SignatureService + StaffingApproveExport shabloni). Hozircha implement
   * qilinmagan; read endpoint'lar (approve/generate GET) to'liq parity'da.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(_body: unknown): Promise<void> {
    throw new BusinessException(
      400,
      this.i18n.t('messages.feature_not_available'),
    );
  }

  /**
   * DELETE /api/v1/economist/staffing/approve/{id} — Laravel `StaffingApproveController::destroy`.
   * findOrFail → confirmation === SUCCESS bo'lsa o'chirib bo'lmaydi → soft-delete.
   */
  async approveDestroy(id: number): Promise<void> {
    const [row] = await this.db
      .select({
        id: staffing_approves.id,
        confirmation: staffing_approves.confirmation,
      })
      .from(staffing_approves)
      .where(eq(staffing_approves.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (row.confirmation === CONFIRMATION_STATUS_SUCCESS) {
      throw new BusinessException(
        400,
        this.i18n.t(
          'messages.you_cannot_delete_a_document_that_has_been_approved',
        ),
      );
    }
    await this.db
      .update(staffing_approves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(staffing_approves.id, id));
  }
}
