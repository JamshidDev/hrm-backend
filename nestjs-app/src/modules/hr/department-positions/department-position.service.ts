// DepartmentPosition service. Laravel: DepartmentPositionService.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import {
  DepartmentPositionMapper,
  type DepartmentPositionIndexRow,
  type DepartmentPositionShowRow,
} from '@/modules/hr/department-positions/department-position.mapper';
import {
  QueryDepartmentPositionDto,
  CreateDepartmentPositionDto,
  UpdateDepartmentPositionDto,
  DepartmentPositionListResponseDto,
  DepartmentPositionShowDto,
} from '@/modules/hr/department-positions/dto/department-position.dto';

const POSITION_STATUS_ACTIVE = 2; // PositionStatusEnum::ACTIVE
const CHANGED_STATUS_DELETED = 3; // ChangedStatusEnum::DELETED
const CONFIRM_STATUS_NEW = 1; // ConfirmStatusEnum::NEW

@Injectable()
export class DepartmentPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(
    filters: QueryDepartmentPositionDto,
  ): Promise<DepartmentPositionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const deptIds = filters.departments
      ? filters.departments
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : null;

    // Search Laravel `joinSearch`: d.name OR p.name ILIKE %search%.
    const searchCond = filters.search
      ? or(
          ilike(departments.name, `%${filters.search}%`),
          ilike(positionsTable.name, `%${filters.search}%`),
        )
      : undefined;

    // Laravel DepartmentPosition::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      department_positions.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      isNull(department_positions.deleted_at),
      searchCond,
      inScope,
      deptIds && deptIds.length > 0
        ? inArray(department_positions.department_id, deptIds)
        : undefined,
      filters.department_id
        ? eq(department_positions.department_id, filters.department_id)
        : undefined,
    );

    // Search joinda — count'da ham join kerak (departments+positions). Bo'lmasa oddiy count.
    const offset = (page - 1) * perPage;

    const countQuery = filters.search
      ? this.db
          .select({
            total: sql<number>`COUNT(DISTINCT ${department_positions.id})`,
          })
          .from(department_positions)
          .leftJoin(
            departments,
            eq(departments.id, department_positions.department_id),
          )
          .leftJoin(
            positionsTable,
            eq(positionsTable.id, department_positions.position_id),
          )
          .where(where)
      : this.db
          .select({ total: count() })
          .from(department_positions)
          .where(where);

    const [rows, [{ total }]] = await Promise.all([
      this.fetchIndexRows(where, perPage, offset),
      countQuery,
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((row) =>
        DepartmentPositionMapper.toIndexItem(row, this.i18n, lang),
      ),
    };
  }

  async findOne(id: number): Promise<DepartmentPositionShowDto> {
    const row = await this.fetchShowRow(id);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return DepartmentPositionMapper.toShowItem(row, this.i18n, this.ctx.lang);
  }

  async create(dto: CreateDepartmentPositionDto): Promise<void> {
    // Laravel: department -> organization_id ni avtomatik to'ldiradi (toDto).
    const [dept] = await this.db
      .select({ organization_id: departments.organization_id })
      .from(departments)
      .where(
        and(eq(departments.id, dto.department_id), notDeleted(departments)),
      )
      .limit(1);
    if (!dept) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    await this.db.insert(department_positions).values({
      organization_id: dept.organization_id,
      department_id: dto.department_id,
      position_id: dto.position_id,
      // Laravel Attribute set: rate * 100 (e.g. "4.00" → 400 in DB).
      rate: Math.round(Number(dto.rate) * 100),
      education: dto.education,
      rank: dto.rank,
      salary: dto.salary,
      experience: dto.experience,
      group: dto.group,
      max_rank: dto.max_rank,
    });
  }

  async update(id: number, dto: UpdateDepartmentPositionDto): Promise<void> {
    const current = await this.fetchOneRaw(id);
    if (!current) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: agar position_id yoki rate o'zgargan bo'lsa — `status=NEW, changed_status=UPDATED`.
    const positionChanged = current.position_id !== dto.position_id;
    // current.rate scaled (DB raw, e.g. 400). dto.rate user-facing (e.g. 4).
    const rateChanged =
      Number(current.rate) !== Math.round(Number(dto.rate) * 100);
    const extra: Record<string, unknown> = {};
    if (positionChanged || rateChanged) {
      extra.status = CONFIRM_STATUS_NEW;
      extra.changed_status = 2; // ChangedStatusEnum::UPDATED
    }

    await this.db
      .update(department_positions)
      .set({
        department_id: dto.department_id,
        position_id: dto.position_id,
        rate: Math.round(Number(dto.rate) * 100),
        education: dto.education,
        rank: dto.rank,
        salary: dto.salary,
        experience: dto.experience,
        group: dto.group,
        max_rank: dto.max_rank,
        ...extra,
      })
      .where(eq(department_positions.id, id));

    // Laravel: syncWorkerPositions — agar position_id yoki department_id o'zgargan bo'lsa,
    // bog'liq worker_positions ni yangilash. RabbitMQ push qoldiriladi (parity yo'q).
    if (positionChanged || current.department_id !== dto.department_id) {
      const updateData: Record<string, unknown> = {};
      if (positionChanged) updateData.position_id = dto.position_id;
      if (current.department_id !== dto.department_id) {
        updateData.department_id = dto.department_id;
      }
      if (Object.keys(updateData).length > 0) {
        await this.db
          .update(worker_positions)
          .set(updateData)
          .where(eq(worker_positions.department_position_id, id));
      }
    }
  }

  async remove(id: number): Promise<void> {
    const row = await this.fetchOneRaw(id);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: faol worker_positions bo'lsa — exception.
    const [active] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(
        and(
          eq(worker_positions.department_position_id, id),
          eq(worker_positions.status, POSITION_STATUS_ACTIVE),
        ),
      )
      .limit(1);
    if (active) {
      throw new BusinessException(
        422,
        this.i18n.t('messages.department_position_has_workers'),
      );
    }

    // Laravel: status=NEW + changed_status=DELETED, keyin soft delete.
    await this.db
      .update(department_positions)
      .set({
        status: CONFIRM_STATUS_NEW,
        changed_status: CHANGED_STATUS_DELETED,
        deleted_at: sql`NOW()`,
      })
      .where(eq(department_positions.id, id));
  }

  // ---- Helpers ----

  private async fetchOneRaw(id: number) {
    const [row] = await this.db
      .select()
      .from(department_positions)
      .where(
        and(
          eq(department_positions.id, id),
          isNull(department_positions.deleted_at),
        ),
      )
      .limit(1);
    return row;
  }

  private async fetchIndexRows(
    where: ReturnType<typeof and> | undefined,
    limit: number,
    offset: number,
  ): Promise<DepartmentPositionIndexRow[]> {
    const rows = await this.db
      .select({
        id: department_positions.id,
        organization_id: department_positions.organization_id,
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        rate: department_positions.rate,
        group: department_positions.group,
        rank: department_positions.rank,
        max_rank: department_positions.max_rank,
        salary: department_positions.salary,
        experience: department_positions.experience,
        education: department_positions.education,
        status: department_positions.status,
        changed_status: department_positions.changed_status,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
        worker_rate: sql<number>`COALESCE(SUM(CASE WHEN ${worker_positions.status} = ${POSITION_STATUS_ACTIVE} AND ${worker_positions.deleted_at} IS NULL THEN ${worker_positions.rate} ELSE 0 END), 0)`,
      })
      .from(department_positions)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, department_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, department_positions.position_id),
      )
      .leftJoin(
        departments,
        eq(departments.id, department_positions.department_id),
      )
      .leftJoin(
        worker_positions,
        eq(worker_positions.department_position_id, department_positions.id),
      )
      .where(where)
      .groupBy(
        department_positions.id,
        organizations.id,
        departments.id,
        positionsTable.id,
      )
      // Laravel: orderBy(o.id) -> orderBy(d.id) -> orderByDesc(dp.id).
      .orderBy(
        asc(organizations.id),
        asc(departments.id),
        desc(department_positions.id),
      )
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      department_id: r.department_id,
      position_id: r.position_id,
      rate: r.rate,
      group: r.group,
      rank: r.rank,
      max_rank: r.max_rank,
      salary: r.salary,
      experience: r.experience,
      education: r.education,
      status: r.status,
      changed_status: r.changed_status,
      worker_rate: Number(r.worker_rate ?? 0),
      org_name: r.org_name,
      org_name_ru: r.org_name_ru,
      org_name_en: r.org_name_en,
      org_group: r.org_group ?? false,
      dept_name: r.dept_name,
      dept_level: r.dept_level,
      pos_name: r.pos_name,
    }));
  }

  private async fetchShowRow(
    id: number,
  ): Promise<DepartmentPositionShowRow | null> {
    const [row] = await this.db
      .select({
        id: department_positions.id,
        organization_id: department_positions.organization_id,
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        rate: department_positions.rate,
        group: department_positions.group,
        rank: department_positions.rank,
        max_rank: department_positions.max_rank,
        salary: department_positions.salary,
        experience: department_positions.experience,
        education: department_positions.education,
        status: department_positions.status,
        changed_status: department_positions.changed_status,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        pos_name_ru: positionsTable.name_ru,
        pos_classification_index: positionsTable.classification_index,
        pos_classification_code: positionsTable.classification_code,
        worker_rate: sql<number>`COALESCE((SELECT SUM(${worker_positions.rate}) FROM ${worker_positions} WHERE ${worker_positions.department_position_id} = ${department_positions.id} AND ${worker_positions.status} = ${POSITION_STATUS_ACTIVE} AND ${worker_positions.deleted_at} IS NULL), 0)`,
      })
      .from(department_positions)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, department_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(
        departments,
        eq(departments.id, department_positions.department_id),
      )
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, department_positions.position_id),
      )
      .where(
        and(
          eq(department_positions.id, id),
          isNull(department_positions.deleted_at),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      organization_id: row.organization_id,
      department_id: row.department_id,
      position_id: row.position_id,
      rate: row.rate,
      group: row.group,
      rank: row.rank,
      max_rank: row.max_rank,
      salary: row.salary,
      experience: row.experience,
      education: row.education,
      status: row.status,
      changed_status: row.changed_status,
      worker_rate: Number(row.worker_rate ?? 0),
      organization: row.org_id
        ? {
            id: row.org_id,
            name: row.org_name,
            name_ru: row.org_name_ru,
            name_en: row.org_name_en,
            group: row.org_group ?? false,
          }
        : null,
      department: row.dept_id
        ? {
            id: row.dept_id,
            name: row.dept_name ?? '',
            level: row.dept_level ?? 0,
          }
        : null,
      position: row.pos_id
        ? {
            id: row.pos_id,
            name: row.pos_name ?? '',
            name_ru: row.pos_name_ru,
            classification_index: row.pos_classification_index,
            classification_code: row.pos_classification_code,
          }
        : null,
    };
  }
}
