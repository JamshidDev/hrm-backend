// Contract service. Laravel: ContractController::index() (only).

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
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  commands as commandsTable,
  contracts,
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ContractMapper } from '@/modules/hr/contracts/contract.mapper';
import {
  ContractListResponseDto,
  CreateContractDto,
  QueryContractDto,
} from '@/modules/hr/contracts/dto/contract.dto';

const CONFIRMATION_STATUS_SUCCESS = 3;
const POSITION_STATUS_ACTIVE = 2;

@Injectable()
export class ContractService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {
    void notDeleted; // silencer
  }

  async findAll(filters: QueryContractDto): Promise<ContractListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : [];

    const searchCond = filters.search
      ? or(
          ilike(contracts.number, `%${filters.search}%`),
          ilike(workers.last_name, `%${filters.search}%`),
          ilike(workers.first_name, `%${filters.search}%`),
          ilike(workers.middle_name, `%${filters.search}%`),
        )
      : undefined;

    const where = and(
      isNull(contracts.deleted_at),
      filters.organization_id
        ? eq(contracts.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0 ? inArray(contracts.organization_id, orgIds) : undefined,
      filters.confirmation
        ? eq(contracts.confirmation, filters.confirmation)
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const countQuery = filters.search
      ? this.db
          .select({ total: sql<number>`COUNT(DISTINCT ${contracts.id})` })
          .from(contracts)
          .leftJoin(workers, eq(workers.id, contracts.worker_id))
          .where(where)
      : this.db.select({ total: count() }).from(contracts).where(where);

    const [rows, [{ total }]] = await Promise.all([
      this.fetchRows(where, perPage, offset),
      countQuery,
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map((r) => ContractMapper.toItem(r, this.i18n, lang, this.minio)),
      ),
    };
  }

  private async fetchRows(
    where: ReturnType<typeof and> | undefined,
    limit: number,
    offset: number,
  ) {
    return this.db
      .select({
        id: contracts.id,
        number: contracts.number,
        file: contracts.file,
        confirmation_file: contracts.confirmation_file,
        contract_date: contracts.contract_date,
        type: contracts.type,
        command_status: contracts.command_status,
        status: contracts.status,
        confirmation: contracts.confirmation,
        generate: contracts.generate,
        created_at: contracts.created_at,
        user_id: contracts.user_id,
        worker_id: workers.id,
        worker_uuid: workers.uuid,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_birthday: workers.birthday,
        worker_pin: workers.pin,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
      })
      .from(contracts)
      .leftJoin(workers, eq(workers.id, contracts.worker_id))
      .leftJoin(organizations, eq(organizations.id, contracts.organization_id))
      .where(where)
      .orderBy(desc(contracts.id))
      .limit(limit)
      .offset(offset);
  }

  // POST /api/v1/hr/contracts
  // Simplified — inserts contract record + worker_position (if data provided).
  // Laravel'da DocumentReplace + command creation + confirmations bor; bu yerda
  // asosiy yozuv qoldirilgan.
  async create(dto: CreateContractDto): Promise<{ contract_id: number }> {
    const userId = this.ctx.user_or_fail.id;

    return await this.db.transaction(async (tx) => {
      const [contract] = await tx
        .insert(contracts)
        .values({
          uuid: sql`uuid_generate_v4()`,
          organization_id: dto.organization_id,
          worker_id: dto.worker_id,
          user_id: userId,
          director_id: dto.director_id,
          command_status: dto.command_status ? 1 : 2,
          number: String(dto.number),
          contract_date: dto.contract_date ?? null,
          contract_to_date: dto.contract_to_date ?? null,
          table_number:
            dto.table_number != null ? Number(dto.table_number) : null,
          type: dto.type,
        })
        .returning({ id: contracts.id });

      // Create related worker_position if department_position provided.
      if (dto.department_position_id) {
        await tx.insert(worker_positions).values({
          uuid: sql`uuid_generate_v4()`,
          organization_id: dto.organization_id,
          department_id: dto.department_id ?? null,
          department_position_id: dto.department_position_id,
          position_id: dto.position_id ?? null,
          contract_id: contract.id,
          worker_id: dto.worker_id,
          type: dto.type,
          position_date: dto.position_date ?? this.today(),
          contract_position: true,
          probation: dto.probation ? Number(dto.probation) : 0,
          vacation_main_day: dto.vacation_main_day ?? 0,
          additional_vacation_day: dto.additional_vacation_day ?? 0,
          group: dto.group ? Number(dto.group) : 0,
          rank: dto.rank ? String(dto.rank) : null,
          rate: dto.rate != null ? Math.trunc(Number(dto.rate)) : 100,
          salary: dto.salary != null ? Number(dto.salary) : null,
          post_name: dto.post_name ?? null,
          status: dto.position_status ?? POSITION_STATUS_ACTIVE,
        });
      }

      return { contract_id: contract.id };
    });
  }

  // GET /api/v1/hr/contracts/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select({
        id: contracts.id,
        uuid: contracts.uuid,
        number: contracts.number,
        contract_date: contracts.contract_date,
        contract_to_date: contracts.contract_to_date,
        table_number: contracts.table_number,
        type: contracts.type,
        status: contracts.status,
        confirmation: contracts.confirmation,
        command_status: contracts.command_status,
        file: contracts.file,
        confirmation_file: contracts.confirmation_file,
        worker_id: workers.id,
        worker_uuid: workers.uuid,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_photo: workers.photo,
        worker_birthday: workers.birthday,
        worker_pin: workers.pin,
        org_id: organizations.id,
        org_name: organizations.name,
        org_group: organizations.group,
      })
      .from(contracts)
      .leftJoin(workers, eq(workers.id, contracts.worker_id))
      .leftJoin(organizations, eq(organizations.id, contracts.organization_id))
      .where(and(eq(contracts.id, id), notDeleted(contracts)))
      .limit(1);

    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Load contract_position (worker_position where contract_id=this AND contract_position=true).
    const [cp] = await this.db
      .select({
        id: worker_positions.id,
        type: worker_positions.type,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        org_id: organizations.id,
        org_name: organizations.name,
      })
      .from(worker_positions)
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .where(
        and(
          eq(worker_positions.contract_id, id),
          eq(worker_positions.contract_position, true),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);

    // Load command + confirmations.
    const [command] = await this.db
      .select({
        id: commandsTable.id,
        uuid: commandsTable.uuid,
        type: commandsTable.type,
        date: commandsTable.command_date,
        number: commandsTable.command_number,
      })
      .from(commandsTable)
      .where(
        and(
          eq(commandsTable.contract_model_id, id),
          eq(commandsTable.contract_model_type, 'contract'),
        ),
      )
      .limit(1);

    const confirmationRows = await this.db
      .select()
      .from(command_confirmations)
      .where(eq(command_confirmations.command_id, command?.id ?? 0));

    return {
      id: row.id,
      uuid: row.uuid,
      number: row.number,
      contract_date: row.contract_date,
      contract_to_date: row.contract_to_date,
      table_number: row.table_number,
      type: row.type,
      status: row.status,
      confirmation: row.confirmation,
      command_status: row.command_status,
      file: await this.minio.fileUrl(row.file),
      confirmation_file: await this.minio.fileUrl(row.confirmation_file),
      worker: row.worker_id
        ? {
            id: row.worker_id,
            uuid: row.worker_uuid,
            last_name: row.worker_last,
            first_name: row.worker_first,
            middle_name: row.worker_middle,
            photo: await this.minio.fileUrl(row.worker_photo),
            birthday: row.worker_birthday,
            pin: row.worker_pin,
          }
        : null,
      organization: row.org_id
        ? { id: row.org_id, name: row.org_name, group: row.org_group ?? false }
        : null,
      contract_position: cp
        ? {
            id: cp.id,
            type: cp.type,
            department: cp.dept_id
              ? { id: cp.dept_id, name: cp.dept_name, level: cp.dept_level }
              : null,
            position: cp.pos_id ? { id: cp.pos_id, name: cp.pos_name } : null,
            organization: cp.org_id
              ? { id: cp.org_id, name: cp.org_name }
              : null,
          }
        : null,
      command: command ?? null,
      confirmations: confirmationRows,
    };
  }

  // DELETE /api/v1/hr/contracts/{id}
  // Laravel: ContractConfirmationService::deleteContract — confirmed status'da
  // o'chirib bo'lmaydi. Bu yerda soft-delete.
  async remove(id: number): Promise<void> {
    const [contract] = await this.db
      .select({ id: contracts.id, confirmation: contracts.confirmation })
      .from(contracts)
      .where(and(eq(contracts.id, id), notDeleted(contracts)))
      .limit(1);
    if (!contract) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (contract.confirmation === CONFIRMATION_STATUS_SUCCESS) {
      throw new BusinessException(
        409,
        this.i18n.t('messages.you_cannot_delete_a_document_that_has_been_approved'),
      );
    }
    await this.db
      .update(contracts)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(contracts.id, id));

    // Soft delete related worker_position too.
    await this.db
      .update(worker_positions)
      .set({ deleted_at: sql`NOW()` })
      .where(
        and(
          eq(worker_positions.contract_id, id),
          eq(worker_positions.contract_position, true),
        ),
      );
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
