// ContractAdditional service. Laravel: ContractAdditionalController::index().

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  contract_additional,
  organizations,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { sql } from 'drizzle-orm';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ContractAdditionalMapper } from '@/modules/hr/contract-additional/contract-additional.mapper';
import {
  ContractAdditionalListResponseDto,
  CreateContractAdditionalDto,
  QueryContractAdditionalDto,
} from '@/modules/hr/contract-additional/dto/contract-additional.dto';

@Injectable()
export class ContractAdditionalService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryContractAdditionalDto,
  ): Promise<ContractAdditionalListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : [];

    const searchCond = filters.search
      ? or(
          ilike(workers.last_name, `%${filters.search}%`),
          ilike(workers.first_name, `%${filters.search}%`),
          ilike(workers.middle_name, `%${filters.search}%`),
        )
      : undefined;

    const where = and(
      isNull(contract_additional.deleted_at),
      filters.organization_id
        ? eq(contract_additional.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(contract_additional.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: contract_additional.id,
          number: contract_additional.number,
          file: contract_additional.file,
          confirmation_file: contract_additional.confirmation_file,
          contract_date: contract_additional.contract_date,
          contract_to_date: contract_additional.contract_to_date,
          type: contract_additional.type,
          command_status: contract_additional.command_status,
          confirmation: contract_additional.confirmation,
          generate: contract_additional.generate,
          created_at: contract_additional.created_at,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_birthday: workers.birthday,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(contract_additional)
        .leftJoin(workers, eq(workers.id, contract_additional.worker_id))
        .leftJoin(
          organizations,
          eq(organizations.id, contract_additional.organization_id),
        )
        .where(where)
        .orderBy(desc(contract_additional.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(contract_additional)
        .leftJoin(workers, eq(workers.id, contract_additional.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map((r) =>
          ContractAdditionalMapper.toItem(r, this.i18n, lang, this.minio),
        ),
      ),
    };
  }

  // POST /api/v1/hr/contract-additional
  async create(dto: CreateContractAdditionalDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const organizationId =
      dto.organization_id ?? this.ctx.user_or_fail.organization_id;
    if (!organizationId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    const cmdStatus =
      typeof dto.command_status === 'boolean'
        ? dto.command_status
          ? 1
          : 2
        : Number(dto.command_status);

    await this.db.insert(contract_additional).values({
      uuid: sql`uuid_generate_v4()`,
      organization_id: organizationId,
      worker_position_id: dto.worker_position_id,
      user_id: userId,
      director_id: dto.director_id,
      worker_id: dto.worker_id ?? null,
      command_status: cmdStatus,
      number: dto.number != null ? Number(dto.number) : null,
      contract_date: dto.contract_date,
      contract_to_date: dto.contract_to_date ?? null,
      type: dto.type,
    });
  }

  // DELETE /api/v1/hr/contract-additional/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({
        id: contract_additional.id,
        confirmation: contract_additional.confirmation,
      })
      .from(contract_additional)
      .where(and(eq(contract_additional.id, id), notDeleted(contract_additional)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (row.confirmation === 3) {
      throw new BusinessException(
        409,
        this.i18n.t('messages.you_cannot_delete_a_document_that_has_been_approved'),
      );
    }
    await this.db
      .update(contract_additional)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(contract_additional.id, id));
  }

  // POST /api/v1/hr/contract-additional/{id}/confirmation
  async confirmation(id: number, _file?: unknown): Promise<void> {
    const [row] = await this.db
      .select({ id: contract_additional.id })
      .from(contract_additional)
      .where(and(eq(contract_additional.id, id), notDeleted(contract_additional)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Set confirmation = SUCCESS.
    await this.db
      .update(contract_additional)
      .set({ confirmation: 3, updated_at: sql`NOW()` })
      .where(eq(contract_additional.id, id));
  }
}
