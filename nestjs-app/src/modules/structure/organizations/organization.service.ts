// Organization service. Laravel: OrganizationController.
//
// Read endpoints:
//   - findAll: whereIsRoot (parent_id IS NULL) + paginate + descendants count.
//   - listForSearch: name OR full_name LIKE.
//   - levels: enum list (i18n).
//   - findOne: organization + children list.
//
// Write endpoints — basic insert/update (NestedSet rebalancing skipped — Laravel parallel tree'ni boshqaradi).

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { OrganizationMapper } from '@/modules/structure/organizations/organization.mapper';
import {
  QueryOrganizationDto,
  QueryOrganizationListDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationListResponseDto,
  OrganizationListMinimalDto,
  OrganizationLevelDto,
  OrganizationShowResponseDto,
} from '@/modules/structure/organizations/dto/organization.dto';

// OrganizationLevelEnum: 1=DEPARTMENT, 2=MANAGEMENT, 3=COMPANY, 4=ORGANIZATION
const LEVEL_KEYS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
};

@Injectable()
export class OrganizationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(
    filters: QueryOrganizationDto,
  ): Promise<OrganizationListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    // Laravel scopeSearch — name OR full_name OR name_ru OR code LIKE.
    // whereIsRoot: parent_id IS NULL (NestedSet root tugun).
    const search = filters.search?.trim();
    const where = and(
      notDeleted(organizations),
      isNull(organizations.parent_id),
      search
        ? or(
            ilike(organizations.name, `%${search}%`),
            ilike(organizations.full_name, `%${search}%`),
            ilike(organizations.name_ru, `%${search}%`),
            ilike(organizations.code, `%${search}%`),
          )
        : undefined,
    );

    const result = await paginate({
      db: this.db,
      countTable: organizations,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.organizations.findMany({
          where: {
            deleted_at: { isNull: true },
            parent_id: { isNull: true },
            ...(search
              ? {
                  OR: [
                    { name: { ilike: `%${search}%` } },
                    { full_name: { ilike: `%${search}%` } },
                    { name_ru: { ilike: `%${search}%` } },
                    { code: { ilike: `%${search}%` } },
                  ],
                }
              : {}),
          },
          with: {
            // Laravel CityResource: region: RegionMinimalResource = {id, name}.
            city: {
              with: {
                region: { columns: { id: true, name: true } },
              },
            },
          },
          // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.
          limit,
          offset,
        }),
      page,
      perPage,
      // Mapper deferred — descendants count'ni alohida computamiz.
      mapper: (o) => o,
    });

    // Laravel `with('descendants')->count()` — soft-deleted'larni qo'shmaydi.
    // _lft/_rgt formula hammasini hisoblaydi → manual count.
    const counts = await this.computeDescendantsCount(
      result.data.map((o) => ({ id: o.id, _lft: o._lft, _rgt: o._rgt })),
    );

    return {
      ...result,
      data: result.data.map((o) =>
        OrganizationMapper.toItem(o, counts[o.id] ?? 0),
      ),
    };
  }

  // Per-org descendants count — soft-delete filter bilan.
  // Bitta query'da hammasi: SELECT parent.id, COUNT(child.id)
  //   FROM organizations parent LEFT JOIN organizations child
  //   ON child._lft > parent._lft AND child._rgt < parent._rgt AND child.deleted_at IS NULL
  //   WHERE parent.id IN (...) GROUP BY parent.id.
  private async computeDescendantsCount(
    parents: { id: number; _lft: number; _rgt: number }[],
  ): Promise<Record<number, number>> {
    const result: Record<number, number> = {};
    if (parents.length === 0) return result;

    // Har parent uchun alohida count — bitta query'da union bo'lishi mumkin, lekin
    // 10 ta org uchun 10 ta count — qabul qilinadi (N small).
    const promises = parents.map(async (p) => {
      const [row] = await this.db
        .select({ c: sql<number>`COUNT(*)` })
        .from(organizations)
        .where(
          and(
            sql`${organizations._lft} > ${p._lft}`,
            sql`${organizations._rgt} < ${p._rgt}`,
            notDeleted(organizations),
          ),
        );
      result[p.id] = Number(row?.c ?? 0);
    });
    await Promise.all(promises);
    return result;
  }

  // Laravel: list($search) — paginatesiz, name yoki full_name LIKE.
  async listForSearch(
    filters: QueryOrganizationListDto,
  ): Promise<OrganizationListMinimalDto[]> {
    const lang = this.ctx.lang;
    const search = filters.search?.trim() ?? '';

    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        group: organizations.group,
      })
      .from(organizations)
      .where(
        and(
          notDeleted(organizations),
          search
            ? or(
                ilike(organizations.name, `%${search}%`),
                ilike(organizations.full_name, `%${search}%`),
              )
            : undefined,
        ),
      );
    // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.

    return rows.map((r) => OrganizationMapper.toListMinimal(r, lang));
  }

  // OrganizationLevelEnum::list() ekvivalenti.
  levels(): OrganizationLevelDto[] {
    const lang = this.ctx.lang;
    return [1, 2, 3, 4].map((id) => {
      const key = LEVEL_KEYS[id];
      const name = this.i18n.t(`messages.organization_levels.${key}`, { lang });
      return { id, name: typeof name === 'string' ? name : '' };
    });
  }

  // Laravel show: organization + city.region preload + children list.
  async findOne(id: number): Promise<OrganizationShowResponseDto> {
    const org = await this.db.query.organizations.findFirst({
      where: { id, deleted_at: { isNull: true } },
      with: {
        city: { with: { region: { columns: { id: true, name: true } } } },
      },
    });
    if (!org) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const children = await this.db.query.organizations.findMany({
      where: { parent_id: id, deleted_at: { isNull: true } },
      with: {
        city: { with: { region: { columns: { id: true, name: true } } } },
      },
    });

    // Descendants counts — soft-deleted hisobga olinmaydi.
    const counts = await this.computeDescendantsCount([
      { id: org.id, _lft: org._lft, _rgt: org._rgt },
      ...children.map((c) => ({ id: c.id, _lft: c._lft, _rgt: c._rgt })),
    ]);

    return {
      organization: OrganizationMapper.toItem(org, counts[org.id] ?? 0),
      children: children.map((c) =>
        OrganizationMapper.toItem(c, counts[c.id] ?? 0),
      ),
    };
  }

  // ---- Write endpoints (basic — no NestedSet rebalancing) ----

  async create(dto: CreateOrganizationDto): Promise<void> {
    const nextId = await this.nextId();
    await this.db.insert(organizations).values({
      id: nextId,
      city_id: dto.city_id,
      name: dto.name,
      full_name: dto.full_name,
      level: dto.level,
      group: dto.group ?? false,
      code: dto.code,
      parent_id: dto.parent_id ?? null,
    });
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<void> {
    await this.findById(id);

    const updates: Record<string, unknown> = {};
    if (dto.city_id !== undefined) updates.city_id = dto.city_id;
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.full_name !== undefined) updates.full_name = dto.full_name;
    if (dto.level !== undefined) updates.level = dto.level;
    if (dto.group !== undefined) updates.group = dto.group;
    if (dto.code !== undefined) updates.code = dto.code;
    if (dto.external !== undefined) updates.external = dto.external;
    if (dto.parent_id !== undefined) updates.parent_id = dto.parent_id;

    if (Object.keys(updates).length === 0) return;
    await this.db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, id));
  }

  // Laravel forceDelete — soft delete EMAS, fizik o'chirish.
  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db.delete(organizations).where(eq(organizations.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.id, id), notDeleted(organizations)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${organizations.id}), 0)` })
      .from(organizations);
    return Number(row?.maxId ?? 0) + 1;
  }
}
