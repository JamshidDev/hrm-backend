// Command service. Laravel: CommandController::index().
// Batch-load worker confirmations (type='w') for each command.

import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  commands,
  command_confirmations,
  organizations,
  workers,
  worker_positions,
  vacations,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { CommandMapper } from '@/modules/hr/commands/command.mapper';
import { CommandReplaceService } from '@/modules/hr/commands/command-replace.service';
import {
  CommandListResponseDto,
  CreateCommandDto,
  QueryCommandDto,
} from '@/modules/hr/commands/dto/command.dto';
import type { CommandWorkerConfirmationRow } from '@/modules/hr/commands/command.types';
import { randomUUID } from 'crypto';

@Injectable()
export class CommandService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly replace: CommandReplaceService,
    private readonly convert: ConvertService,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(filters: QueryCommandDto): Promise<CommandListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    // Laravel Command::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(commands.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const where = and(
      isNull(commands.deleted_at),
      inScope,
      filters.confirmation
        ? eq(commands.confirmation, filters.confirmation)
        : undefined,
    );

    const offset = (page - 1) * perPage;

    const [cmdRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: commands.id,
          command_number: commands.command_number,
          command_date: commands.command_date,
          type: commands.type,
          file: commands.file,
          confirmation_file: commands.confirmation_file,
          generate: commands.generate,
          created_at: commands.created_at,
          confirmation: commands.confirmation,
          organization_id: commands.organization_id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(commands)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, commands.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(desc(commands.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(commands).where(where),
    ]);

    // Batch-load worker confirmations (type='w').
    const cmdIds = cmdRows.map((c) => c.id);
    const workerConfirmations: CommandWorkerConfirmationRow[] = cmdIds.length
      ? await this.db
          .select({
            id: command_confirmations.id,
            command_id: command_confirmations.command_id,
            position: command_confirmations.position,
            worker_id: workers.id,
            worker_uuid: workers.uuid,
            worker_photo: workers.photo,
            worker_last: workers.last_name,
            worker_first: workers.first_name,
            worker_middle: workers.middle_name,
          })
          .from(command_confirmations)
          .leftJoin(workers, eq(workers.id, command_confirmations.worker_id))
          .where(
            and(
              inArray(command_confirmations.command_id, cmdIds),
              eq(command_confirmations.type, 'w'),
              isNull(command_confirmations.deleted_at),
            ),
          )
          .orderBy(asc(command_confirmations.id))
      : [];

    const wcByCmd = new Map<number, CommandWorkerConfirmationRow[]>();
    for (const wc of workerConfirmations) {
      if (wc.command_id == null) continue;
      const arr = wcByCmd.get(wc.command_id) ?? [];
      arr.push(wc);
      wcByCmd.set(wc.command_id, arr);
    }

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        cmdRows.map((c) =>
          CommandMapper.toItem(
            c,
            wcByCmd.get(c.id) ?? [],
            this.i18n,
            lang,
            this.minio,
          ),
        ),
      ),
    };
  }

  // POST /api/v1/hr/commands
  // Laravel: Command model `creating` boot event `file` + `confirmation_file`
  // avtomatik o'rnatadi, CommandReplaceService DOCX hosil qiladi → MinIO,
  // DocxToPdfJob esa PDF konvertatsiya qiladi (generate: 2→3).
  async create(dto: CreateCommandDto) {
    const userId = this.ctx.user_or_fail.id;
    const organizationId =
      dto.organization_id ?? this.ctx.user_or_fail.organization_id;
    if (!organizationId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    const uuid = randomUUID();
    // Laravel Command model boot('creating') bilan bir xil yo'l shabloni.
    const docxKey = `commands/${uuid}.docx`;
    const pdfKey = `documents/commands/${uuid}.pdf`;

    // DOCX + confirmations'ni OLDIN tayyorlaymiz — generatsiya xato bo'lsa
    // command yozilmaydi (Laravel: DB::transaction ichida replace() rollback).
    let docxBuffer: Buffer | null = null;
    let confRows: Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }> = [];
    if (CommandReplaceService.SUPPORTED_TYPES.includes(dto.command_type)) {
      docxBuffer = await this.replace.buildDeleteTypeDocx(dto);
      confRows = await this.replace.buildDeleteTypeConfirmations(dto);
    } else if (CommandReplaceService.CREATE_TYPES.includes(dto.command_type)) {
      docxBuffer = await this.replace.buildCreateTypeDocx(dto);
      confRows = await this.replace.buildCreateTypeConfirmations(dto);
    } else if (CommandReplaceService.UPDATE_TYPES.includes(dto.command_type)) {
      docxBuffer = await this.replace.buildUpdateTypeDocx(dto);
      // Update tasdiqlovchilari delete bilan bir xil (worker_position'dan).
      confRows = await this.replace.buildDeleteTypeConfirmations(dto);
    } else if (
      CommandReplaceService.MANY_WORKER_TYPES.includes(dto.command_type)
    ) {
      docxBuffer = await this.replace.buildManyWorkerDocx(dto);
      confRows = await this.replace.buildManyWorkerConfirmations(dto);
    } else if (
      CommandReplaceService.VACATION_TYPES.includes(dto.command_type)
    ) {
      docxBuffer = await this.replace.buildVacationDocx(dto);
      // Vacation tasdiqlovchilari delete bilan bir xil (worker_position'dan).
      confRows = await this.replace.buildDeleteTypeConfirmations(dto);
    }

    // Command + command_confirmations'ni bitta transaction ichida yozamiz.
    const cmd = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(commands)
        .values({
          uuid,
          organization_id: organizationId,
          type: dto.command_type,
          user_id: userId,
          director_id: dto.director_id,
          command_date: dto.command_date,
          command_number: dto.command_number ?? null,
          file: docxKey,
          confirmation_file: pdfKey,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returning({ id: commands.id });

      // command_confirmations — hodim (w) + imzolovchilar (s) + direktor (d).
      if (confRows.length) {
        await tx.insert(command_confirmations).values(
          confRows.map((r) => ({
            command_id: created.id,
            worker_id: r.worker_id,
            position: r.position,
            type: r.type,
            order: r.order,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
      }
      return created;
    });

    // DOCX'ni MinIO'ga yuklash (sinxron — `doc_url` darhol ishlashi uchun).
    if (docxBuffer) {
      await this.minio.putObject(
        docxKey,
        docxBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      // PDF konvertatsiya — fon rejimida (Laravel DocxToPdfJob async).
      // generate: 2=jarayonda, 3=tayyor, 4=xato.
      void this.generateCommandPdf(cmd.id, docxBuffer, pdfKey);
    }

    return { command_id: cmd.id };
  }

  // DOCX→PDF konvertatsiya + MinIO yuklash + `generate` statusini yangilash.
  // Laravel DocxToPdfJob ekvivalenti — fon jarayoni sifatida ishlaydi.
  private async generateCommandPdf(
    commandId: number,
    docxBuffer: Buffer,
    pdfKey: string,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.convert.docxToPdf(docxBuffer);
      await this.minio.putObject(pdfKey, pdfBuffer, 'application/pdf');
      await this.db
        .update(commands)
        .set({ generate: 3 })
        .where(eq(commands.id, commandId));
    } catch {
      // Konvertatsiya muvaffaqiyatsiz — generate=4 (xato).
      await this.db
        .update(commands)
        .set({ generate: 4 })
        .where(eq(commands.id, commandId));
    }
  }

  // DELETE /api/v1/hr/commands/{id}
  async remove(id: number): Promise<void> {
    const [cmd] = await this.db
      .select({ id: commands.id, confirmation: commands.confirmation })
      .from(commands)
      .where(and(eq(commands.id, id), notDeleted(commands)))
      .limit(1);
    if (!cmd) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Confirmation SUCCESS bo'lsa, o'chirib bo'lmaydi.
    if (cmd.confirmation === 3) {
      throw new BusinessException(
        409,
        this.i18n.t(
          'messages.you_cannot_delete_a_document_that_has_been_approved',
        ),
      );
    }
    await this.db
      .update(commands)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(commands.id, id));
  }

  // GET /api/v1/hr/worker-additional/{workerPositionId}?type=
  // Laravel: CommandService::checkWorkerPositionAdditional.
  async checkWorkerPositionAdditional(
    workerPositionId: number,
    type: string,
  ): Promise<{ type: string; data: Record<string, unknown> }> {
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.id, workerPositionId))
      .limit(1);
    if (!wp) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    let experienceYears = 0;
    if (wp.worker_id) {
      const [w] = await this.db
        .select({ experience_date: workers.experience_date })
        .from(workers)
        .where(eq(workers.id, wp.worker_id))
        .limit(1);
      if (w?.experience_date) {
        const ed = new Date(w.experience_date);
        const diffMs = Date.now() - ed.getTime();
        experienceYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      }
    }

    // Last vacation (latest id) for worker.
    let lastVac: {
      period_to: string | null;
      rest_day: number;
      all_day: number;
    } | null = null;
    if (wp.worker_id) {
      const [v] = await this.db
        .select({
          period_to: vacations.period_to,
          rest_day: vacations.rest_day,
          all_day: vacations.all_day,
        })
        .from(vacations)
        .where(
          and(eq(vacations.worker_id, wp.worker_id), notDeleted(vacations)),
        )
        .orderBy(desc(vacations.id))
        .limit(1);
      if (v) lastVac = v;
    }

    const expAbs = Math.abs(experienceYears);
    const data = (() => {
      switch (type) {
        case 'pension_count':
          return {
            year: expAbs,
            count: Math.abs(Math.trunc(expAbs / 5)),
          };
        case 'pension_coefficient':
          return {
            year: expAbs,
            coefficient: this.getCoefficient(expAbs),
          };
        case 'salary_withholding':
        case 'compensation': {
          let period2: string | null = null;
          if (lastVac?.period_to) {
            const d = new Date(lastVac.period_to);
            d.setFullYear(d.getFullYear() + 1);
            period2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return {
            period1: lastVac?.period_to ?? null,
            period2,
            rest_day: lastVac ? Math.abs(lastVac.rest_day) : null,
            all_day: lastVac ? Math.abs(lastVac.all_day) : null,
            month: new Date().getMonth() + 1,
          };
        }
        case 'financial_assistance':
          return {
            experience_coefficient: this.getCoefficient(expAbs),
          };
        default:
          throw new BusinessException(
            422,
            this.i18n.t('messages.invalid_type'),
          );
      }
    })();

    return { type, data };
  }

  private getCoefficient(years: number): number {
    if (years <= 10) return 30;
    if (years <= 20) return 50;
    return 70;
  }
}
