// ContractAdditional service. Laravel: ContractAdditionalController::index().

import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  confirmation_workers,
  contract_additional,
  contract_additional_confirmations,
  organizations,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { sql } from 'drizzle-orm';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ContractAdditionalMapper } from '@/modules/hr/contract-additional/contract-additional.mapper';
import {
  ContractAdditionalListResponseDto,
  CreateContractAdditionalDto,
  QueryContractAdditionalDto,
} from '@/modules/hr/contract-additional/dto/contract-additional.dto';
import { ContractReplaceService } from '@/modules/hr/contracts/contract-replace.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { RedisService } from '@/shared/redis/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ContractAdditionalService {
  private readonly logger = new Logger(ContractAdditionalService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
    private readonly replace: ContractReplaceService,
    private readonly convert: ConvertService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    filters: QueryContractAdditionalDto,
  ): Promise<ContractAdditionalListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);
    // Laravel ContractAdditional::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      contract_additional.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      isNull(contract_additional.deleted_at),
      inScope,
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
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, contract_additional.worker_position_id),
        )
        // Laravel: worker => new WorkerInfoResource($this->worker) — faqat
        // contract_additional.worker_id (worker_position fallback YO'Q).
        // Relation SoftDeletes → o'chirilgan bo'lsa null.
        .leftJoin(
          workers,
          and(
            eq(workers.id, contract_additional.worker_id),
            isNull(workers.deleted_at),
          ),
        )
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, contract_additional.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(desc(contract_additional.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(contract_additional)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, contract_additional.worker_position_id),
        )
        .leftJoin(
          workers,
          eq(
            workers.id,
            sql`COALESCE(${contract_additional.worker_id}, ${worker_positions.worker_id})`,
          ),
        )
        .where(where),
    ]);

    // Laravel paginate() javobida `per_page` yo'q — parity uchun qaytarmaymiz.
    return {
      current_page: page,
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

    // ContractCommandStatusEnum: FORMED=2 (buyruq bilan), NOT_MANDATORY=3
    // (to'g'ridan-to'g'ri). Laravel ContractAdditionalService::store parity —
    // command_status ? FORMED : NOT_MANDATORY. NOT_MANDATORY bo'lsa side-effect
    // (applyContractAdditionalConfirmation) tasdiqda to'g'ridan-to'g'ri ishlaydi.
    const hasCommand =
      dto.command_status === true ||
      dto.command_status === 1 ||
      dto.command_status === '1';
    const cmdStatus = hasCommand ? 2 : 3;

    const uuid = randomUUID();
    const docxKey = `contract-additional/${uuid}.docx`;
    const pdfKey = `documents/contract-additional/${uuid}.pdf`;

    // DOCX'ni OLDIN tayyorlaymiz — generatsiya xato bo'lsa yozuv yaratilmaydi
    // (Laravel ContractService → contractAdditionalReplace).
    dto.organization_id = organizationId;
    const docxBuffer = await this.replace.buildContractAdditionalDocx(dto);

    // worker_id + contract_id worker_position'dan (Laravel systemData parity).
    // type 12/13 finish parent contract'ni FINISHED qilish uchun contract_id
    // contract_additional yozuvida bo'lishi SHART.
    const [wp] = await this.db
      .select({
        worker_id: worker_positions.worker_id,
        contract_id: worker_positions.contract_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.id, dto.worker_position_id))
      .limit(1);
    const workerId = dto.worker_id ?? wp?.worker_id ?? null;

    const [row] = await this.db
      .insert(contract_additional)
      .values({
        uuid,
        organization_id: organizationId,
        worker_position_id: dto.worker_position_id,
        user_id: userId,
        director_id: dto.director_id,
        worker_id: workerId,
        contract_id: wp?.contract_id ?? null,
        command_status: cmdStatus,
        number: dto.number != null ? Number(dto.number) : null,
        contract_date: dto.contract_date,
        contract_to_date: dto.contract_to_date ?? null,
        type: dto.type,
        // Laravel ContractAdditional model boot('creating') — file yo'llari va
        // vaqt belgilarini avtomatik o'rnatadi (aks holda show 404 beradi).
        file: docxKey,
        confirmation_file: pdfKey,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning({ id: contract_additional.id });

    // contract_additional_confirmations — Laravel createConfirmation: hodim 'w'
    // + direktor 'd'. Tasdiqlash document/signature oqimi orqali bo'ladi va
    // hammasi SUCCESS bo'lganda applyContractAdditionalConfirmation ishlaydi.
    const [director] = await this.db
      .select({
        worker_id: confirmation_workers.worker_id,
        position: confirmation_workers.position,
      })
      .from(confirmation_workers)
      .where(eq(confirmation_workers.id, dto.director_id))
      .limit(1);
    const confRows: Array<{
      contract_additional_id: number;
      type: string;
      worker_id: number | null;
      position: string | null;
    }> = [];
    if (workerId) {
      confRows.push({
        contract_additional_id: row.id,
        type: 'w',
        worker_id: workerId,
        position: null,
      });
    }
    if (director?.worker_id) {
      confRows.push({
        contract_additional_id: row.id,
        type: 'd',
        worker_id: director.worker_id,
        position: director.position ?? null,
      });
    }
    if (confRows.length) {
      await this.db.insert(contract_additional_confirmations).values(
        confRows.map((r) => ({
          ...r,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })),
      );
    }

    // DOCX'ni MinIO'ga (sinxron) + PDF (fon).
    await this.minio.putObject(
      docxKey,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Layer 1: confirmation side-effect uchun systemData snapshot (Laravel
    // ContractAdditionalService::storeJson). Tasdiqlangach
    // applyContractAdditionalConfirmation shu `data`ni o'qib xodim lavozimini
    // o'zgartiradi (1→updateWorker, 8→updateWorkerPosition, 12/13→finished).
    const snapshot = {
      request: dto,
      data: {
        // Laravel: worker_id + contract_id worker_position'dan keladi (type 8
        // updateWorkerPosition → createWorker uchun worker_id MAJBURIY).
        worker_id: workerId,
        contract_id: wp?.contract_id ?? null,
        worker_position_id: dto.worker_position_id,
        organization_id: organizationId,
        type: dto.type,
        group: dto.group ?? null,
        rank: dto.rank ?? null,
        rate: dto.rate ?? null,
        salary: dto.salary ?? null,
        department_position_id: dto.department_position_id ?? null,
        // ad-contract sanasi = lavozim o'zgarish sanasi (position_date yo'q).
        position_date: dto.contract_date,
        contract_to_date: dto.contract_to_date ?? null,
      },
    };
    try {
      await this.minio.putObject(
        `json/contract-additional/${row.id}.json`,
        Buffer.from(JSON.stringify(snapshot), 'utf-8'),
        'application/json',
      );
    } catch (e) {
      this.logger.warn(
        `ad-contract ${row.id} snapshot JSON xato: ${(e as Error).message}`,
      );
    }

    void this.generatePdf(row.id, userId, docxBuffer, pdfKey);
  }

  // DOCX→PDF konvertatsiya + MinIO yuklash (fon). Laravel DocxToPdfJob:
  // muvaffaqiyatda generate=3 + socket 'contract.additional.generated' xabari,
  // xatoda generate=4.
  private async generatePdf(
    id: number,
    userId: number,
    docxBuffer: Buffer,
    pdfKey: string,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.convert.docxToPdf(docxBuffer);
      await this.minio.putObject(pdfKey, pdfBuffer, 'application/pdf');
      await this.db
        .update(contract_additional)
        .set({ generate: 3 })
        .where(eq(contract_additional.id, id));
      // Real-time "hujjat tayyor" xabari (Laravel Redis::publish parity).
      await this.redis.publishNotification(userId, {
        type: 'contract.additional.generated',
        alert: 'info',
        duration: 3000,
        documentId: id,
        title: this.i18n.t('messages.document.created'),
        message: this.i18n.t('messages.document.created'),
        action: null,
      });
    } catch {
      // PDF konvertatsiya muvaffaqiyatsiz — generate=4 (xato).
      await this.db
        .update(contract_additional)
        .set({ generate: 4 })
        .where(eq(contract_additional.id, id));
    }
  }

  // DELETE /api/v1/hr/contract-additional/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({
        id: contract_additional.id,
        confirmation: contract_additional.confirmation,
      })
      .from(contract_additional)
      .where(
        and(eq(contract_additional.id, id), notDeleted(contract_additional)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (row.confirmation === 3) {
      throw new BusinessException(
        409,
        this.i18n.t(
          'messages.you_cannot_delete_a_document_that_has_been_approved',
        ),
      );
    }
    await this.db
      .update(contract_additional)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(contract_additional.id, id));
  }
}
