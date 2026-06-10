import { Injectable } from '@nestjs/common';
import { count, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { vacancy_approve_organizations, organizations } from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import {
  QueryVacancyApproveDto,
  AttachVacancyApproveDto,
  VacancyApproveListResponseDto,
  VacancyOrganizationMinDto,
} from '@/modules/structure/vacancy-approve/dto/vacancy-approve.dto';

interface OrgMinRow {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  group: boolean;
}

@Injectable()
export class VacancyApproveService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(
    filters: QueryVacancyApproveDto,
  ): Promise<VacancyApproveListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const offset = (page - 1) * perPage;

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacancy_approve_organizations)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(vacancy_approve_organizations),
    ]);

    const orgIds = new Set<number>();
    for (const r of list) {
      orgIds.add(r.from_organization_id);
      orgIds.add(r.to_organization_id);
    }

    const orgMap = await this.fetchOrganizations([...orgIds]);

    const data = list.map((r) => ({
      id: r.id,
      from: this.toMin(orgMap[r.from_organization_id], lang),
      to: this.toMin(orgMap[r.to_organization_id], lang),
    }));

    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  async attach(dto: AttachVacancyApproveDto): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(vacancy_approve_organizations)
        .where(
          eq(
            vacancy_approve_organizations.from_organization_id,
            dto.from_organization_id,
          ),
        );

      if (dto.to_organization_ids.length > 0) {
        await tx.insert(vacancy_approve_organizations).values(
          dto.to_organization_ids.map((toId) => ({
            from_organization_id: dto.from_organization_id,
            to_organization_id: toId,
          })),
        );
      }
    });
  }

  async remove(id: number): Promise<void> {
    await this.db
      .delete(vacancy_approve_organizations)
      .where(eq(vacancy_approve_organizations.id, id));
  }

  private async fetchOrganizations(
    ids: number[],
  ): Promise<Record<number, OrgMinRow>> {
    const result: Record<number, OrgMinRow> = {};
    if (ids.length === 0) return result;

    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        group: organizations.group,
      })
      .from(organizations)
      .where(inArray(organizations.id, ids));

    for (const r of rows) {
      result[r.id] = {
        id: r.id,
        name: r.name,
        name_ru: r.name_ru,
        name_en: r.name_en,
        group: r.group ?? false,
      };
    }
    return result;
  }

  private toMin(
    org: OrgMinRow | undefined,
    lang: string,
  ): VacancyOrganizationMinDto | null {
    if (!org) return null;
    let name = org.name;
    if (lang === 'ru') name = org.name_ru ?? org.name;
    else if (lang === 'en') name = org.name_en ?? org.name;
    return { id: org.id, name, group: org.group };
  }
}
