import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organization_services } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrganizationServiceMapper } from '@/modules/structure/organization-services/organization-service.mapper';
import {
  QueryOrganizationServiceDto,
  CreateOrganizationServiceDto,
  OrganizationServiceItemDto,
} from '@/modules/structure/organization-services/dto/organization-service.dto';

@Injectable()
export class OrganizationServiceService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async findAll(
    filters: QueryOrganizationServiceDto,
  ): Promise<OrganizationServiceItemDto[]> {
    const rows = await this.db.query.organization_services.findMany({
      columns: { key: true, active: true },
      where: {
        // Laravel where('organization_id', $id): yo'q bo'lsa IS NULL.
        organization_id:
          filters.organization_id != null
            ? filters.organization_id
            : { isNull: true },
        deleted_at: { isNull: true },
      },
    });

    return OrganizationServiceMapper.toEnumList(rows);
  }

  async create(dto: CreateOrganizationServiceDto): Promise<void> {
    const existing = await this.db
      .select({ id: organization_services.id })
      .from(organization_services)
      .where(
        and(
          eq(organization_services.organization_id, dto.organization_id),
          notDeleted(organization_services),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(organization_services)
        .set({
          key: dto.key,
          active: dto.active ?? false,
        })
        .where(eq(organization_services.id, existing[0].id));
    } else {
      await this.db.insert(organization_services).values({
        organization_id: dto.organization_id,
        key: dto.key,
        active: dto.active ?? false,
      });
    }
  }
}
