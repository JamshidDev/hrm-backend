import { Injectable } from '@nestjs/common';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgTable, AnyPgColumn } from 'drizzle-orm/pg-core';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService, type UploadedFile } from '@/shared/minio/minio.service';
import { DocumentTypeMapper } from '@/modules/structure/document-types/document-type.mapper';
import {
  QueryDocumentTypeDto,
  DocumentTypeListResponseDto,
} from '@/modules/structure/document-types/dto/document-type.dto';

export interface DocumentTypeTableConfig {
  table: PgTable & {
    id: AnyPgColumn;
    organization_id: AnyPgColumn;
    type: AnyPgColumn;
    deleted_at: AnyPgColumn;
  };
  enumMap: Record<number, string>;
}

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    cfg: DocumentTypeTableConfig,
    filters: QueryDocumentTypeDto,
  ): Promise<DocumentTypeListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : null;
    const singleOrgId = filters.organization_id
      ? Number(filters.organization_id)
      : null;

    const where = and(
      notDeleted(cfg.table),
      orgIds && orgIds.length > 0
        ? inArray(cfg.table.organization_id as never, orgIds)
        : undefined,
      singleOrgId
        ? eq(cfg.table.organization_id as never, singleOrgId)
        : undefined,
    );

    return paginate({
      db: this.db,
      countTable: cfg.table,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.fetchWithOrganization(cfg, where, limit, offset),
      page,
      perPage,
      mapper: (row) =>
        DocumentTypeMapper.toItem(row, cfg.enumMap, this.i18n, lang),
    });
  }

  async create(
    cfg: DocumentTypeTableConfig,
    folder: string,
    type: number,
    organizations: number[],
    file: UploadedFile | undefined,
  ): Promise<void> {
    if (!file) {
      throw new BusinessException(422, 'file is required');
    }
    if (!type) {
      throw new BusinessException(422, 'type is required');
    }
    if (!organizations || organizations.length === 0) {
      throw new BusinessException(422, 'organizations is required');
    }

    const filePath = await this.minio.uploadFormFile(file, folder, [
      'doc',
      'docx',
    ]);

    await this.db.transaction(async (tx) => {
      const values = organizations.map((orgId) => ({
        type,
        file: filePath,
        organization_id: orgId,
      }));
      await tx.insert(cfg.table).values(values);
    });
  }

  async update(
    cfg: DocumentTypeTableConfig,
    folder: string,
    id: number,
    organization_id: number,
    type: number,
    file: UploadedFile | undefined,
  ): Promise<void> {
    await findByIdOrFail(this.db, cfg.table, id, this.i18n);

    const updates: Record<string, unknown> = {
      organization_id,
      type,
    };
    if (file) {
      updates.file = await this.minio.uploadFormFile(file, folder, [
        'doc',
        'docx',
      ]);
    }
    await this.db
      .update(cfg.table)
      .set(updates)
      .where(eq(cfg.table.id as never, id));
  }

  async remove(cfg: DocumentTypeTableConfig, id: number): Promise<void> {
    await findByIdOrFail(this.db, cfg.table, id, this.i18n);
    await softDeleteById(this.db, cfg.table, id);
  }

  private async fetchWithOrganization(
    cfg: DocumentTypeTableConfig,
    where: SQL | undefined,
    limit: number,
    offset: number,
  ): Promise<
    {
      id: number;
      type: number;
      organization: {
        id: number;
        name: string | null;
        name_ru: string | null;
        name_en: string | null;
        group: boolean;
      } | null;
    }[]
  > {
    const rows = await this.db
      .select({
        id: cfg.table.id,
        type: cfg.table.type,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
      })
      .from(cfg.table)
      .leftJoin(
        organizations,
        eq(cfg.table.organization_id as never, organizations.id),
      )
      .where(where)
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id as number,
      type: r.type as number,
      organization: r.org_id
        ? {
            id: r.org_id,
            name: r.org_name,
            name_ru: r.org_name_ru,
            name_en: r.org_name_en,
            group: r.org_group ?? false,
          }
        : null,
    }));
  }
}
