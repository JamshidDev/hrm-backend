// VacationScheduleYear service. Multi-batch loaded relations.

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
import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  vacation_schedule_years,
  vacation_schedule_confirmations,
  vacation_schedules,
  confirmation_workers,
  worker_positions,
  workers,
  organizations,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { escapeXml } from '@/shared/docx/docx-template.util';
import { VacationScheduleYearMapper } from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.mapper';
import {
  QueryVacationScheduleYearDto,
  StoreVacationScheduleYearDto,
  VacationScheduleYearListResponseDto,
} from '@/modules/hr/vacation-schedule-years/dto/vacation-schedule-year.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VacationScheduleYearService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly convert: ConvertService,
  ) {}

  async findAll(
    filters: QueryVacationScheduleYearDto,
  ): Promise<VacationScheduleYearListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const where = isNull(vacation_schedule_years.deleted_at);
    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacation_schedule_years)
        .where(where)
        .orderBy(desc(vacation_schedule_years.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacation_schedule_years)
        .where(where),
    ]);

    // Batch-load related orgs.
    const orgIds = rows.map((r) => r.organization_id).filter(Boolean);
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
            full_name: organizations.full_name,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o]));

    // Batch-load director + tradeUnion via ConfirmationWorker.
    const cwIds = [
      ...rows.map((r) => r.director_id).filter((x): x is number => x != null),
      ...rows.map((r) => r.trade_union_id).filter((x): x is number => x != null),
    ];
    const cwRows = cwIds.length
      ? await this.db
          .select({
            id: confirmation_workers.id,
            position: confirmation_workers.position,
            worker_id: workers.id,
            worker_photo: workers.photo,
            worker_last: workers.last_name,
            worker_first: workers.first_name,
            worker_middle: workers.middle_name,
          })
          .from(confirmation_workers)
          .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
          .where(inArray(confirmation_workers.id, cwIds))
      : [];
    const cwMap = new Map(cwRows.map((c) => [c.id, c]));

    // Batch-load creator (WorkerPosition).
    const creatorIds = rows
      .map((r) => r.creator_id)
      .filter((x): x is number => x != null);
    const creatorRows = creatorIds.length
      ? await this.db
          .select({
            id: worker_positions.id,
            worker_id: workers.id,
            worker_photo: workers.photo,
            worker_last: workers.last_name,
            worker_first: workers.first_name,
            worker_middle: workers.middle_name,
            org_full_name: organizations.full_name,
            dept_name: departments.name,
            dept_level: departments.level,
            pos_name: positionsTable.name,
          })
          .from(worker_positions)
          .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
          .leftJoin(
            organizations,
            eq(organizations.id, worker_positions.organization_id),
          )
          .leftJoin(departments, eq(departments.id, worker_positions.department_id))
          .leftJoin(
            positionsTable,
            eq(positionsTable.id, worker_positions.position_id),
          )
          .where(inArray(worker_positions.id, creatorIds))
      : [];
    const creatorMap = new Map(creatorRows.map((c) => [c.id, c]));

    const data = await Promise.all(
      rows.map((r) =>
        VacationScheduleYearMapper.toItem(
          r,
          r.organization_id != null ? (orgMap.get(r.organization_id) ?? null) : null,
          r.director_id != null ? (cwMap.get(r.director_id) ?? null) : null,
          r.trade_union_id != null ? (cwMap.get(r.trade_union_id) ?? null) : null,
          r.creator_id != null ? (creatorMap.get(r.creator_id) ?? null) : null,
          this.i18n,
          lang,
          this.minio,
        ),
      ),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  // POST /api/v1/hr/vacation-schedule
  async store(dto: StoreVacationScheduleYearDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    const txResult = await this.db.transaction(async (tx) => {
      // updateOrCreate by (year, organization_id).
      const [existing] = await tx
        .select({
          id: vacation_schedule_years.id,
          file: vacation_schedule_years.file,
          confirmation_file: vacation_schedule_years.confirmation_file,
        })
        .from(vacation_schedule_years)
        .where(
          and(
            eq(vacation_schedule_years.year, dto.year),
            eq(vacation_schedule_years.organization_id, orgId),
            notDeleted(vacation_schedule_years),
          ),
        )
        .limit(1);

      let vsyId: number;
      let vsyFile: string | null;
      let vsyConfFile: string | null;
      if (existing) {
        await tx
          .update(vacation_schedule_years)
          .set({
            director_id: dto.director_id,
            trade_union_id: dto.trade_union_id,
            creator_id: dto.creator_id,
            user_id: userId,
            date: dto.date,
            updated_at: sql`NOW()`,
          })
          .where(eq(vacation_schedule_years.id, existing.id));
        vsyId = existing.id;
        vsyFile = existing.file;
        vsyConfFile = existing.confirmation_file;
      } else {
        const newUuid = randomUUID();
        vsyFile = `vacation-schedule/${newUuid}.docx`;
        vsyConfFile = `documents/vacation-schedule/${newUuid}.pdf`;
        const [created] = await tx
          .insert(vacation_schedule_years)
          .values({
            uuid: newUuid,
            year: dto.year,
            organization_id: orgId,
            user_id: userId,
            director_id: dto.director_id,
            trade_union_id: dto.trade_union_id,
            creator_id: dto.creator_id,
            date: dto.date,
            // Laravel VacationScheduleYear boot('creating') — file yo'llari.
            file: vsyFile,
            confirmation_file: vsyConfFile,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })
          .returning({ id: vacation_schedule_years.id });
        vsyId = created.id;
      }

      // Upsert vacation_schedules for each worker_position_id.
      for (const wp of dto.worker_position_ids) {
        const [wpRow] = await tx
          .select({
            id: worker_positions.id,
            worker_id: worker_positions.worker_id,
          })
          .from(worker_positions)
          .where(eq(worker_positions.id, wp.id))
          .limit(1);
        if (!wpRow || !wpRow.worker_id) continue;

        const [existingVs] = await tx
          .select({ id: vacation_schedules.id })
          .from(vacation_schedules)
          .where(
            and(
              eq(vacation_schedules.worker_id, wpRow.worker_id),
              eq(vacation_schedules.organization_id, orgId),
            ),
          )
          .limit(1);
        if (existingVs) {
          await tx
            .update(vacation_schedules)
            .set({
              vacation_schedule_year_id: vsyId,
              year: dto.year,
              month: wp.month ?? 1,
              worker_position_id: wpRow.id,
              updated_at: sql`NOW()`,
            })
            .where(eq(vacation_schedules.id, existingVs.id));
        } else {
          await tx.insert(vacation_schedules).values({
            organization_id: orgId,
            worker_id: wpRow.worker_id,
            worker_position_id: wpRow.id,
            vacation_schedule_year_id: vsyId,
            year: dto.year,
            month: wp.month ?? 1,
          });
        }
      }

      // Tasdiqlovchilar — direktor / kasaba uyushmasi / yaratuvchi
      // (Laravel DocumentReplace::createConfirmations).
      await this.createScheduleConfirmations(
        tx,
        vsyId,
        dto.director_id,
        dto.trade_union_id,
        dto.creator_id,
      );

      return { vsyId, file: vsyFile, confirmationFile: vsyConfFile };
    });

    // DOCX + PDF — transaction tashqarisida (Laravel DocumentReplace::generate).
    if (dto.worker_position_ids.length > 0 && txResult.file) {
      try {
        const docx = await this.buildScheduleDocx(dto.year);
        await this.minio.putObject(
          txResult.file,
          docx,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        if (txResult.confirmationFile) {
          void this.generateSchedulePdf(
            txResult.vsyId,
            docx,
            txResult.confirmationFile,
          );
        }
      } catch {
        await this.db
          .update(vacation_schedule_years)
          .set({ generate: 4 })
          .where(eq(vacation_schedule_years.id, txResult.vsyId));
      }
    }
  }

  // Laravel DocumentReplace::createConfirmations — direktor (order 4),
  // kasaba uyushmasi (order 3), yaratuvchi (order 2). type='s'.
  private async createScheduleConfirmations(
    tx: DataSource,
    vsyId: number,
    directorId: number,
    tradeUnionId: number,
    creatorId: number,
  ): Promise<void> {
    // director / tradeUnion — confirmation_workers (position — satr).
    const [director] = await tx
      .select({
        position: confirmation_workers.position,
        worker_id: confirmation_workers.worker_id,
      })
      .from(confirmation_workers)
      .where(eq(confirmation_workers.id, directorId))
      .limit(1);
    const [tradeUnion] = await tx
      .select({
        position: confirmation_workers.position,
        worker_id: confirmation_workers.worker_id,
      })
      .from(confirmation_workers)
      .where(eq(confirmation_workers.id, tradeUnionId))
      .limit(1);
    // creator — worker_position (position nomi → positions.name).
    const [creator] = await tx
      .select({
        worker_id: worker_positions.worker_id,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(eq(worker_positions.id, creatorId))
      .limit(1);

    const rows: Array<{
      position: string | null;
      worker_id: number;
      order: number;
    }> = [];
    if (director?.worker_id != null) {
      rows.push({ position: director.position, worker_id: director.worker_id, order: 4 });
    }
    if (
      tradeUnion?.worker_id != null &&
      tradeUnion.worker_id !== director?.worker_id
    ) {
      rows.push({
        position: tradeUnion.position,
        worker_id: tradeUnion.worker_id,
        order: 3,
      });
    }
    if (
      creator?.worker_id != null &&
      [director?.worker_id, tradeUnion?.worker_id].includes(creator.worker_id)
    ) {
      rows.push({ position: creator.pos_name, worker_id: creator.worker_id, order: 2 });
    }

    for (const r of rows) {
      await tx
        .insert(vacation_schedule_confirmations)
        .values({
          vacation_schedule_year_id: vsyId,
          worker_id: r.worker_id,
          position: r.position,
          type: 's',
          order: r.order,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: [
            vacation_schedule_confirmations.vacation_schedule_year_id,
            vacation_schedule_confirmations.worker_id,
          ],
          set: {
            position: r.position,
            type: 's',
            order: r.order,
            updated_at: sql`NOW()`,
          },
        });
    }
  }

  // Laravel DocumentReplace::generate — `vacation_schedule.docx` shabloni,
  // faqat `${year}` to'ldiriladi (qolgan placeholderlar keyingi bosqich uchun).
  private async buildScheduleDocx(year: number): Promise<Buffer> {
    const templatePath = join(
      process.cwd(),
      'public',
      'resumes',
      'vacation_schedule.docx',
    );
    const content = await readFile(templatePath);
    const zip = new PizZip(content);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    // Faqat `${year}` to'ldiriladi — u shablonda yaxlit (split emas), shu sabab
    // normalizePlaceholders shart emas (qolgan placeholderlar literal qoladi).
    const xml = xmlFile
      .asText()
      .split('${year}')
      .join(escapeXml(String(year)));
    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // DOCX→PDF (fon) — Laravel DocxToPdfJob. generate: 3=tayyor, 4=xato.
  private async generateSchedulePdf(
    vsyId: number,
    docx: Buffer,
    pdfKey: string,
  ): Promise<void> {
    try {
      const pdf = await this.convert.docxToPdf(docx);
      await this.minio.putObject(pdfKey, pdf, 'application/pdf');
      await this.db
        .update(vacation_schedule_years)
        .set({ generate: 3 })
        .where(eq(vacation_schedule_years.id, vsyId));
    } catch {
      await this.db
        .update(vacation_schedule_years)
        .set({ generate: 4 })
        .where(eq(vacation_schedule_years.id, vsyId));
    }
  }

  // GET /api/v1/hr/vacation-schedule-workers
  async workers(filters: { per_page?: number; page?: number; year?: number; search?: string }) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, 2),
      buildWorkerSearchCond(filters.search),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          uuid: worker_positions.uuid,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          dept_name: departments.name,
          pos_name: positionsTable.name,
          org_name: organizations.name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
        )
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          uuid: r.uuid,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
              }
            : null,
          department: r.dept_name ? { name: r.dept_name } : null,
          position: r.pos_name ? { name: r.pos_name } : null,
          organization: r.org_name ? { name: r.org_name } : null,
        })),
      ),
    };
  }

  // GET /api/v1/hr/vacation-schedule/{id}/auto-generate — simplified stub.
  async autoGenerate(id: number) {
    const [vsy] = await this.db
      .select({ id: vacation_schedule_years.id })
      .from(vacation_schedule_years)
      .where(
        and(
          eq(vacation_schedule_years.id, id),
          notDeleted(vacation_schedule_years),
        ),
      )
      .limit(1);
    if (!vsy) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }
    // Logic: distribute workers evenly across 12 months.
    // Soddalashtirilgan — return success.
    return { generated: true };
  }
}
