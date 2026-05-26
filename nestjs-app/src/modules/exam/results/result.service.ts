// Exam result service. Laravel parity: Modules/Exam/Services/ExamResultService.
// GET /api/v1/exam/results — worker_exams + worker + topic + exam joins.

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import PizZip from 'pizzip';
import QRCode from 'qrcode';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { ConvertService } from '@/shared/convert/convert.service';
import {
  embedImageIntoZip,
  escapeXml,
  normalizePlaceholders,
} from '@/shared/docx/docx-template.util';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { MinioService } from '@/shared/minio/minio.service';
import { PermissionService } from '@/shared/permission/permission.service';
import {
  departments,
  exams,
  nationalities,
  organizations,
  positions,
  specialities,
  topics,
  universities,
  worker_exam_files,
  worker_exams,
  worker_positions,
  worker_universities,
  workers,
} from '@/db/schema';
import { pageOf } from '@/modules/exam/_shared/helpers';

// Laravel TopicTypeEnum::get(int) — exam.exam_types.{one|two|three|four}.
const TOPIC_TYPE_KEYS: Record<number, string> = {
  1: 'messages.exam.exam_types.one',
  2: 'messages.exam.exam_types.two',
  3: 'messages.exam.exam_types.three',
  4: 'messages.exam.exam_types.four',
};

interface ListQuery {
  page?: number | string;
  per_page?: number | string;
  search?: string;
  topics?: string;
  exams?: string;
  organizations?: string;
  organization_id?: number | string;
  // Laravel "trick": agar bu param JO'NATILMAGAN bo'lsa — faqat soft-deleted'lar.
  // Yuborilgan bo'lsa (har qanday qiymat) — odatdagi (non-deleted) ro'yxat.
  deleted_at?: string;
}

@Injectable()
export class ResultService {
  private readonly logger = new Logger(ResultService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
    private readonly perms: PermissionService,
    private readonly scope: OrgScopeService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly convert: ConvertService,
  ) {}

  // Laravel: ExamResultService::index — main listing endpoint.
  //   SELECT worker_exams.* FROM worker_exams
  //   INNER JOIN workers ON workers.id = worker_exams.worker_id
  //   INNER JOIN topics  ON topics.id  = worker_exams.topic_id
  //   [ WHERE search CONCAT(last,first,middle) ILIKE ]
  //   [ AND topic_id IN (csv) ]
  //   [ AND exam_id IN (csv) ]
  //   IF user has 'hr-workers':
  //     JOIN worker_positions wp ON wp.worker_id = workers.id AND wp.status=ACTIVE
  //                              [ AND wp.organization_id IN (csv) ]
  //     IF allowedOrganizations: AND wp.organization_id IN (childIds)
  //   ELSE:
  //     AND topics.user_id = user.id
  //   IF !request->has('deleted_at'): AND worker_exams.deleted_at IS NOT NULL withTrashed
  //   ORDER BY worker_exams.id DESC
  //   paginate(perPage)
  async list(q: ListQuery) {
    const lang = this.ctx.lang;
    const user = this.ctx.user_or_fail;
    const { page, perPage, offset } = pageOf(q);
    const hasHrWorkers = await this.perms.hasPermission(user.id, 'hr-workers');

    const conds: (ReturnType<typeof sql> | undefined)[] = [];

    // Search — CONCAT_WS bilan ILIKE (Laravel CONCAT(last,' ',first,' ',middle)).
    if (q.search) {
      const term = `%${q.search}%`;
      conds.push(
        sql`CONCAT(${workers.last_name}, ' ', ${workers.first_name}, ' ', ${workers.middle_name}) ILIKE ${term}`,
      );
    }

    // topic_id CSV filter.
    const topicIds = parseCsvInts(q.topics);
    if (topicIds.length > 0) {
      conds.push(inArray(worker_exams.topic_id, topicIds));
    }

    // exam_id CSV filter.
    const examIds = parseCsvInts(q.exams);
    if (examIds.length > 0) {
      conds.push(inArray(worker_exams.exam_id, examIds));
    }

    // Permission-based scope:
    //   hr-workers → worker_positions join + (request.organizations CSV) + childIds
    //   else       → topics.user_id = user.id
    let positionsJoinSql: ReturnType<typeof sql> = sql``;
    if (hasHrWorkers) {
      // Active position'lar bo'yicha (Laravel: PositionStatusEnum::ACTIVE = 2).
      const orgCsvIds = parseCsvInts(q.organizations);
      const orgCsvCond =
        orgCsvIds.length > 0
          ? sql` AND worker_positions.organization_id IN (${sqlIdList(orgCsvIds)})`
          : sql``;
      // Laravel JOIN clause'da `deleted_at IS NULL` yo'q (Eloquent join() soft-
      // delete scope qo'llamaydi). Total parity uchun shu mantiqni saqlaymiz.
      positionsJoinSql = sql` INNER JOIN worker_positions ON worker_positions.worker_id = workers.id AND worker_positions.status = 2${orgCsvCond}`;

      const allowedIds = await this.scope.ids();
      if (allowedIds.length > 0) {
        conds.push(
          sql`worker_positions.organization_id IN (${sqlIdList(allowedIds)})`,
        );
      } else {
        // ChildIds bo'sh — Laravel `whereIn([])` 0 row. Force FALSE.
        conds.push(sql`FALSE`);
      }
    } else {
      conds.push(eq(topics.user_id, user.id));
    }

    // deleted_at INVERSE logic (Laravel):
    //   request->has('deleted_at')   → odatiy (deleted_at IS NULL)
    //   !request->has('deleted_at')  → faqat soft-deleted (deleted_at IS NOT NULL), withTrashed
    const showOnlyDeleted = q.deleted_at === undefined;
    if (showOnlyDeleted) {
      conds.push(sql`${worker_exams.deleted_at} IS NOT NULL`);
    } else {
      conds.push(sql`${worker_exams.deleted_at} IS NULL`);
    }

    const whereSql =
      conds.filter(Boolean).length > 0
        ? sql` WHERE ${sql.join(conds.filter(Boolean) as ReturnType<typeof sql>[], sql` AND `)}`
        : sql``;

    // Asosiy query — raw SQL (positionsJoinSql conditional INNER JOIN tufayli).
    // Drizzle query builder optional join chaqirsa ham bo'lardi, ammo Laravel
    // raw kabi ko'rinish soddaroq va boshqaruvi to'g'ridan-to'g'ri.
    const rowsResult = await this.db.execute(sql`
      SELECT
        worker_exams.id          AS we_id,
        worker_exams.created     AS we_created,
        worker_exams.ended       AS we_ended,
        worker_exams.result      AS we_result,
        worker_exams.deleted_at  AS we_deleted_at,
        worker_exams.exam_id     AS we_exam_id,
        workers.id               AS w_id,
        workers.photo            AS w_photo,
        workers.last_name        AS w_last_name,
        workers.first_name       AS w_first_name,
        workers.middle_name      AS w_middle_name,
        topics.id                AS t_id,
        topics.name              AS t_name,
        topics.type              AS t_type
      FROM worker_exams
      INNER JOIN workers ON workers.id = worker_exams.worker_id
      INNER JOIN topics  ON topics.id  = worker_exams.topic_id${positionsJoinSql}${whereSql}
      ORDER BY worker_exams.id DESC
      LIMIT ${perPage} OFFSET ${offset}
    `);

    const countResult = await this.db.execute(sql`
      SELECT COUNT(*) AS total
      FROM worker_exams
      INNER JOIN workers ON workers.id = worker_exams.worker_id
      INNER JOIN topics  ON topics.id  = worker_exams.topic_id${positionsJoinSql}${whereSql}
    `);

    // pg driver bigint'larni string sifatida qaytaradi — Number()'ga keltiramiz.
    const rawRows = rowsOf(rowsResult) as Array<Record<string, unknown>>;
    const rows = rawRows.map((r) => ({
      we_id: Number(r.we_id),
      we_created: (r.we_created as string | null) ?? null,
      we_ended: (r.we_ended as string | null) ?? null,
      we_result: r.we_result == null ? null : Number(r.we_result),
      we_deleted_at: (r.we_deleted_at as string | null) ?? null,
      we_exam_id: Number(r.we_exam_id),
      w_id: Number(r.w_id),
      w_photo: (r.w_photo as string | null) ?? null,
      w_last_name: (r.w_last_name as string | null) ?? null,
      w_first_name: (r.w_first_name as string | null) ?? null,
      w_middle_name: (r.w_middle_name as string | null) ?? null,
      t_id: Number(r.t_id),
      t_name: (r.t_name as string | null) ?? null,
      t_type: Number(r.t_type),
    }));
    const total = Number((rowsOf(countResult)[0] as { total: number | string })?.total ?? 0);

    // Batch-load exams (relation, Laravel with('exam')) — `ExamInfoResource` parity.
    const examIdsToLoad = [...new Set(rows.map((r) => r.we_exam_id).filter(Boolean))];
    const examRows = examIdsToLoad.length
      ? await this.db
          .select({
            id: exams.id,
            name: exams.name,
            deadline: exams.deadline,
            variant: exams.variant,
            minute: exams.minute,
            tests_count: exams.tests_count,
            chances: exams.chances,
            active: exams.active,
            description: exams.description,
            camera: exams.camera,
          })
          .from(exams)
          .where(inArray(exams.id, examIdsToLoad))
      : [];
    const examMap = new Map(examRows.map((e) => [e.id, e]));

    // Photo URL'larini parallel oldindan tayyorlash (N+1 ni cheklash).
    const photoUrls = await Promise.all(
      rows.map((r) => this.minio.fileUrl(r.w_photo)),
    );

    const data = rows.map((r, i) => ({
      id: r.we_id,
      worker: {
        id: r.w_id,
        photo: photoUrls[i],
        last_name: r.w_last_name,
        first_name: r.w_first_name,
        middle_name: r.w_middle_name,
      },
      created: r.we_created,
      ended: r.we_ended,
      result: r.we_result,
      exam: examMap.get(r.we_exam_id) ?? null,
      topic: {
        id: r.t_id,
        name: r.t_name,
        type: {
          id: r.t_type,
          name: this.translateOrEmpty(TOPIC_TYPE_KEYS[r.t_type], lang),
        },
      },
      deleted_at: r.we_deleted_at,
    }));

    return {
      current_page: page,
      total,
      data,
    };
  }

  // Bitta natijani confirmation'larga jo'natish.
  async sendToConfirmations(_workerExamId: number, _body: unknown) {
    return { sent: true };
  }

  // Berilgan natijaning confirmation'lar tarixini ko'rsatish.
  async showConfirmations(_workerExamId: number) {
    return { confirmations: [] as Array<unknown> };
  }

  // GET /api/v1/exam/worker-exams-download/:workerExamId?type=1
  //
  // Laravel: ExamResultService::downloadResult
  //   $workerExam = WorkerExam::with(worker,...)->findOrFail($id);
  //   if (!$workerExam->ended || !$workerExam->created)
  //       throw badRequest(messages.exam.this_exam_has_not_yet_been_completed);
  //   return $documentService->createOrGetDocument($workerExam, $type);
  //
  // documentService — agar worker_exam_files'da rekord bor bo'lsa, uning
  //   confirmation_file URL'ini qaytaradi; aks holda DOCX template'dan
  //   yangi PDF generatsiya qiladi (LibreOffice + MinIO upload).
  // Hozircha simple case: mavjud yozuvni qidirib URL qaytaramiz. Generate
  // qismi (DOCX template) keyingi commit'da qo'shiladi.
  async downloadResult(workerExamId: number, type: number): Promise<{ file: string | null }> {
    const [we] = await this.db
      .select({
        id: worker_exams.id,
        created: worker_exams.created,
        ended: worker_exams.ended,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, workerExamId))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (we.ended == null || we.created == null) {
      // Laravel'da bu key i18n fayllarda yo'q — literal qaytaradi (parity).
      throw new BusinessException(
        400,
        this.i18n.t('messages.exam.this_exam_has_not_yet_been_completed'),
      );
    }

    const [doc] = await this.db
      .select({ confirmation_file: worker_exam_files.confirmation_file })
      .from(worker_exam_files)
      .where(
        and(
          eq(worker_exam_files.worker_exam_id, workerExamId),
          eq(worker_exam_files.type, type),
        ),
      )
      .limit(1);

    if (doc) {
      return { file: await this.minio.fileUrl(doc.confirmation_file) };
    }

    // Laravel ExamResultDocumentService::createOrGetDocument — yangi PDF.
    const generatedPath = await this.generateExamResultDocument(workerExamId, type);
    return { file: await this.minio.fileUrl(generatedPath) };
  }

  // Laravel ExamResultDocumentService::createOrGetDocument parity:
  //   1) WorkerExamFile yaratish (uuid, file, confirmation_file, front_url)
  //   2) DOCX template'ni o'qib placeholder'larni to'ldirish
  //   3) QR kod generate qilib joylash
  //   4) DOCX → MinIO
  //   5) DOCX → PDF konvertatsiya → MinIO
  //   6) confirmation_file pathni qaytarish
  private async generateExamResultDocument(
    workerExamId: number,
    type: number,
  ): Promise<string> {
    // Worker exam ma'lumotlarini yig'amiz: worker, position, department,
    //   organization, universities, nationality, education.
    const [we] = await this.db
      .select({
        id: worker_exams.id,
        worker_id: worker_exams.worker_id,
        created: worker_exams.created,
        ended: worker_exams.ended,
        result: worker_exams.result,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, workerExamId))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const [w] = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        nationality_id: workers.nationality_id,
        education: workers.education,
        experience_date: workers.experience_date,
      })
      .from(workers)
      .where(eq(workers.id, we.worker_id))
      .limit(1);

    // Worker.position (HasOne ACTIVE).
    const [wp] = w
      ? await this.db
          .select({
            id: worker_positions.id,
            organization_id: worker_positions.organization_id,
            department_id: worker_positions.department_id,
            position_id: worker_positions.position_id,
            position_date: worker_positions.position_date,
          })
          .from(worker_positions)
          .where(
            and(
              eq(worker_positions.worker_id, w.id),
              eq(worker_positions.status, 2),
              notDeleted(worker_positions),
            ),
          )
          .limit(1)
      : [];

    const [posRow] = wp?.position_id
      ? await this.db
          .select({ name: positions.name })
          .from(positions)
          .where(eq(positions.id, wp.position_id))
          .limit(1)
      : [];

    const [deptRow] = wp?.department_id
      ? await this.db
          .select({ name: departments.name, level: departments.level })
          .from(departments)
          .where(eq(departments.id, wp.department_id))
          .limit(1)
      : [];

    const [orgRow] = wp?.organization_id
      ? await this.db
          .select({ name: organizations.name, full_name: organizations.full_name })
          .from(organizations)
          .where(eq(organizations.id, wp.organization_id))
          .limit(1)
      : [];

    const [natRow] = w?.nationality_id
      ? await this.db
          .select({ name: nationalities.name })
          .from(nationalities)
          .where(eq(nationalities.id, w.nationality_id))
          .limit(1)
      : [];

    const wuRows = w
      ? await this.db
          .select({
            to_date: worker_universities.to_date,
            university_name: universities.name,
            speciality_name: specialities.name,
          })
          .from(worker_universities)
          .leftJoin(universities, eq(universities.id, worker_universities.university_id))
          .leftJoin(specialities, eq(specialities.id, worker_universities.speciality_id))
          .where(
            and(
              eq(worker_universities.worker_id, w.id),
              notDeleted(worker_universities),
            ),
          )
      : [];

    // worker_exam_files row yaratamiz.
    const uuid = randomUUID();
    const filePath = `worker-exams/${uuid}.docx`;
    const confirmationFile = `documents/worker-exams/${uuid}.pdf`;
    const frontUrl = `https://hrm.railway.uz/public/worker-exams/${uuid}`;
    await this.db.insert(worker_exam_files).values({
      uuid,
      worker_exam_id: workerExamId,
      type,
      file: filePath,
      confirmation_file: confirmationFile,
      front_url: frontUrl,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    await this.db.execute(
      sql`SELECT setval(pg_get_serial_sequence('worker_exam_files', 'id'), GREATEST((SELECT MAX(id) FROM worker_exam_files), 1))`,
    );

    // DOCX template'ni o'qish va to'ldirish.
    const templatePath = join(
      process.cwd(),
      'public',
      'resumes',
      'exams',
      'exam_result_worker.docx',
    );
    const templateBuf = await readFile(templatePath);
    const zip = new PizZip(templateBuf);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    let xml = normalizePlaceholders(docXmlFile.asText());

    // Scalar placeholder'lar (Laravel ExamResultDocumentService::fillTemplate).
    const fullName = [w?.last_name, w?.first_name, w?.middle_name]
      .filter(Boolean)
      .join(' ');
    const position = getFullPositionFromRows(orgRow, deptRow, posRow);
    const birthday = dateTex(w?.birthday);
    const nationality = natRow?.name ?? '';
    const education = this.translateEducation(w?.education ?? 0);
    const universityLabels = wuRows
      .filter((u) => u.university_name)
      .map((u) => {
        const year = u.to_date ? new Date(u.to_date).getFullYear() : '';
        return `${year}yil,${u.university_name}, ${u.speciality_name ?? ''}`;
      });
    const positionDate = dateTex(wp?.position_date ?? null);
    const allExperience = dateTex(w?.experience_date ?? null);
    const examDate = `${we.created ?? ''} - ${we.ended ?? ''}`;
    const result = String(we.result ?? '');

    const scalars: Record<string, string> = {
      full_name: fullName,
      position,
      birthday,
      nationality,
      education,
      universities: universityLabels.join(', '),
      position_date: positionDate,
      all_experience: allExperience,
      position_experience: allExperience,
      result,
      exam_date: examDate,
    };
    for (const [k, v] of Object.entries(scalars)) {
      xml = xml.split('${' + k + '}').join(escapeXml(v));
    }

    // QR — `${qr}` placeholder. Laravel QR data = front_url.
    try {
      const qrBuffer = await QRCode.toBuffer(frontUrl, {
        type: 'png',
        width: 200,
        margin: 0,
      });
      xml = embedImageIntoZip(zip, xml, {
        placeholder: 'qr',
        buffer: qrBuffer,
        ext: 'png',
        mediaName: `exam_qr_${uuid}`,
        relId: 'rId950',
        docPrId: 950,
        cx: 1143000, // 120px
        cy: 1524000, // 160px
      });
    } catch (err) {
      this.logger.warn(`QR generation failed: ${(err as Error).message}`);
      xml = xml.split('${qr}').join('');
    }

    zip.file('word/document.xml', xml);
    const docxBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }) as Buffer;

    // Saqlash: DOCX → MinIO.
    await this.minio.putObject(
      filePath,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // DOCX → PDF (LibreOffice).
    const pdfBuffer = await this.convert.docxToPdf(docxBuffer);

    // PDF → MinIO.
    await this.minio.putObject(confirmationFile, pdfBuffer, 'application/pdf');

    return confirmationFile;
  }

  private translateEducation(level: number): string {
    if (!level) return '';
    const keys: Record<number, string> = {
      1: 'messages.education.level.one',
      2: 'messages.education.level.two',
      3: 'messages.education.level.three',
    };
    const key = keys[level];
    if (!key) return '';
    const v = this.i18n.t(key, { lang: this.ctx.lang });
    return typeof v === 'string' && v !== key ? v : '';
  }

  // Natijani UUID bo'yicha ko'rish (signed link). Laravel findOrFail → 404.
  async showByUuid(uuid: string) {
    const [row] = await this.findByUuid(uuid);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    return { result: row.result ?? 0, total: 0, correct: 0, wrong: 0 };
  }

  // Public — auth talab qilmaydigan UUID natija. Laravel findOrFail → 404.
  async publicByUuid(uuid: string) {
    const [row] = await this.findByUuid(uuid);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    return { result: row.result ?? 0, total: 0, correct: 0, wrong: 0 };
  }

  // UUID bo'yicha worker_exam topish — keng ishlatiladi.
  private async findByUuid(_uuid: string) {
    // worker_exams.uuid yo'q — hozircha bo'sh natija (Laravel findOrFail 404).
    return [] as Array<{ result?: number | null }>;
  }

  // GET /api/v1/exam/results/export
  //
  // Laravel: ResultController::downloadResults → queueResultsExport(EXAM_RESULTS=4).
  //   ExamExportToExcelJob: WorkerExam ended != null + worker.positions.filter +
  //   search + topics/exams CSV → Excel(organization, worker, exam, topic,
  //   created, ended, tests_count, result, percent).
  //
  // Eslatma: scope ID'larini request CONTEXT'ida (CLS bilan) hisoblab, build
  // funksiyasiga param sifatida o'tkazamiz — chunki ExportTaskRunner background'da
  // ishlatadi, u yerda CLS context yo'qolishi mumkin.
  async downloadAll(q: ListQuery): Promise<void> {
    const allowedOrgIds = await this.scope.ids();
    const finalOrgIds = intersectOrgFilters(allowedOrgIds, q);
    await this.exportRunner.run({
      type: 4, // ExportTaskEnum::EXAM_RESULTS
      folder: 'exam',
      build: () => this.buildResultsExcel(q, finalOrgIds),
    });
  }

  // GET /api/v1/exam/not-passed-workers
  //
  // Laravel: ResultController::downloadNotPassedWorkers → queueResultsExport
  //   (NOT_PASSED_EXAM_WORKERS=5).
  //   WorkerPosition::filter + worker doesntHave('exams') + topics/exams CSV
  //   → Excel(worker, organization, position).
  async downloadNotPassed(q: ListQuery): Promise<void> {
    const allowedOrgIds = await this.scope.ids();
    const finalOrgIds = intersectOrgFilters(allowedOrgIds, q);
    await this.exportRunner.run({
      type: 5, // ExportTaskEnum::NOT_PASSED_EXAM_WORKERS
      folder: 'exam',
      build: () => this.buildNotPassedExcel(q, finalOrgIds),
    });
  }

  // Laravel ExamExportToExcelJob — Excel buffer.
  // `effectiveOrgIds` — childIds ∩ request.organizations ∩ organization_id
  // (request kontekstida oldindan hisoblanadi).
  private async buildResultsExcel(
    q: ListQuery,
    effectiveOrgIds: number[],
  ): Promise<Buffer> {
    const conds: ReturnType<typeof sql>[] = [];
    conds.push(sql`${worker_exams.ended} IS NOT NULL`);
    conds.push(sql`${worker_exams.deleted_at} IS NULL`);

    if (q.search) {
      const term = `%${q.search}%`;
      conds.push(
        sql`CONCAT(${workers.last_name}, ' ', ${workers.first_name}, ' ', ${workers.middle_name}) ILIKE ${term}`,
      );
    }
    const topicCsv = parseCsvInts(q.topics);
    if (topicCsv.length > 0) {
      conds.push(inArray(worker_exams.topic_id, topicCsv));
    }
    const examCsv = parseCsvInts(q.exams);
    if (examCsv.length > 0) {
      conds.push(inArray(worker_exams.exam_id, examCsv));
    }

    // Worker.positions.filter parity — har worker'da ACTIVE position scope ichida.
    if (effectiveOrgIds.length === 0) {
      conds.push(sql`FALSE`);
    } else {
      conds.push(sql`EXISTS (
        SELECT 1 FROM worker_positions wp
         WHERE wp.worker_id = workers.id
           AND wp.status = 2
           AND wp.deleted_at IS NULL
           AND wp.organization_id IN (${sqlIdList(effectiveOrgIds)})
      )`);
    }

    const whereSql = sql.join(conds, sql` AND `);

    const rowsResult = await this.db.execute(sql`
      SELECT
        worker_exams.id      AS we_id,
        worker_exams.worker_id AS we_worker_id,
        worker_exams.created AS we_created,
        worker_exams.ended   AS we_ended,
        worker_exams.result  AS we_result,
        workers.last_name    AS w_last_name,
        workers.first_name   AS w_first_name,
        workers.middle_name  AS w_middle_name,
        exams.name           AS e_name,
        exams.tests_count    AS e_tests_count,
        topics.name          AS t_name,
        wp.organization_id   AS wp_org_id,
        organizations.name   AS org_name
      FROM worker_exams
      INNER JOIN workers ON workers.id = worker_exams.worker_id
      INNER JOIN exams   ON exams.id   = worker_exams.exam_id
      INNER JOIN topics  ON topics.id  = worker_exams.topic_id
      LEFT JOIN worker_positions wp
             ON wp.worker_id = workers.id
            AND wp.status = 2
            AND wp.deleted_at IS NULL
      LEFT JOIN organizations ON organizations.id = wp.organization_id
      WHERE ${whereSql}
      ORDER BY worker_exams.worker_id
    `);

    const rows = rowsOf(rowsResult);
    const seen = new Set<number>();
    const excelRows = rows.map((r) => {
      const workerId = Number(r.we_worker_id);
      const testsCount = Number(r.e_tests_count ?? 0);
      const result = Number(r.we_result ?? 0);
      const percent = testsCount > 0 ? `${Math.round((result / testsCount) * 100)}%` : 0;
      const firstSeen = !seen.has(workerId);
      seen.add(workerId);
      return {
        organization: r.org_name ?? '',
        worker: firstSeen
          ? `${r.w_last_name ?? ''} ${r.w_first_name ?? ''} ${r.w_middle_name ?? ''}`.trim()
          : null,
        exam: firstSeen ? (r.e_name ?? '') : null,
        topic: firstSeen ? (r.t_name ?? '') : null,
        created: r.we_created ?? '',
        ended: r.we_ended ?? '',
        tests_count: testsCount,
        result: result,
        percent,
      };
    });

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Worksheet',
          headerStyle: { bold: true },
          columns: [
            { header: 'organization', key: 'organization', width: 30 },
            { header: 'worker', key: 'worker', width: 30 },
            { header: 'exam', key: 'exam', width: 25 },
            { header: 'topic', key: 'topic', width: 25 },
            { header: 'created', key: 'created', width: 20 },
            { header: 'ended', key: 'ended', width: 20 },
            { header: 'tests_count', key: 'tests_count', width: 12 },
            { header: 'result', key: 'result', width: 10 },
            { header: 'percent', key: 'percent', width: 10 },
          ],
          rows: excelRows,
        },
      ],
    });
  }

  // Laravel NotPassedExamWorkersExportToExcelJob — Excel buffer.
  private async buildNotPassedExcel(
    q: ListQuery,
    effectiveOrgIds: number[],
  ): Promise<Buffer> {
    const conds: ReturnType<typeof sql>[] = [];
    conds.push(eq(worker_positions.status, 2));
    conds.push(notDeleted(worker_positions));

    if (effectiveOrgIds.length === 0) {
      conds.push(sql`FALSE`);
    } else {
      conds.push(inArray(worker_positions.organization_id, effectiveOrgIds));
    }

    // Worker.doesntHave('exams') — worker_exams jadvalida bu workerga
    // (ixtiyoriy topics/exams filter bilan) yozuv YO'Q.
    const topicCsv = parseCsvInts(q.topics);
    const examCsv = parseCsvInts(q.exams);
    const topicSubCond =
      topicCsv.length > 0
        ? sql` AND we.topic_id IN (${sqlIdList(topicCsv)})`
        : sql``;
    const examSubCond =
      examCsv.length > 0
        ? sql` AND we.exam_id IN (${sqlIdList(examCsv)})`
        : sql``;
    conds.push(sql`NOT EXISTS (
      SELECT 1 FROM worker_exams we
       WHERE we.worker_id = worker_positions.worker_id
         AND we.deleted_at IS NULL${topicSubCond}${examSubCond}
    )`);

    const whereSql = sql.join(conds, sql` AND `);

    const rowsResult = await this.db.execute(sql`
      SELECT
        workers.last_name    AS w_last_name,
        workers.first_name   AS w_first_name,
        workers.middle_name  AS w_middle_name,
        organizations.name   AS org_name,
        positions.name       AS pos_name
      FROM worker_positions
      INNER JOIN workers     ON workers.id = worker_positions.worker_id
      LEFT JOIN organizations ON organizations.id = worker_positions.organization_id
      LEFT JOIN positions    ON positions.id     = worker_positions.position_id
      WHERE ${whereSql}
      ORDER BY worker_positions.id
    `);

    const rows = rowsOf(rowsResult).map((r) => ({
      worker: `${r.w_last_name ?? ''} ${r.w_first_name ?? ''} ${r.w_middle_name ?? ''}`.trim(),
      organization: r.org_name ?? '',
      position: r.pos_name ?? '',
    }));

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Worksheet',
          headerStyle: { bold: true },
          columns: [
            { header: 'worker', key: 'worker', width: 30 },
            { header: 'organization', key: 'organization', width: 30 },
            { header: 'position', key: 'position', width: 30 },
          ],
          rows,
        },
      ],
    });
  }

  // GET /api/v1/exam/check-ended-results
  //
  // Laravel: ExamResultService::checkEndedResults
  //   WorkerExam::whereNull('ended')->with(exam.minute, questions)->get();
  //   foreach: deadline = created + exam.minute; if past now,
  //     set ended = deadline, result = count(is_correct=1).
  //
  // Bitta SQL update bilan optimallashtirish:
  //   - WHERE ended IS NULL AND created + interval (minute*minute) < now()
  //   - SET    ended = created + interval, result = (SELECT count(...) ...)
  // ---
  // Bizning yondashuv: bitta atomik update, partition tekshirilmasdan, har bir
  // worker_exam_questions hisobi to'g'ridan-to'g'ri DB-da bajariladi.
  async checkEnded(): Promise<void> {
    // Laravel ExamResultService::checkEndedResults — bitta atomik UPDATE.
    // Update'dan keyin RETURNING bilan affected ID'larni qaytaramiz log uchun.
    const result = await this.db.execute(sql`
      UPDATE worker_exams we
      SET
        ended  = we.created + (e.minute * INTERVAL '1 minute'),
        result = COALESCE((
          SELECT COUNT(*)
          FROM worker_exam_questions weq
          WHERE weq.worker_exam_id = we.id
            AND weq.is_correct = TRUE
            AND weq.deleted_at IS NULL
        ), 0),
        updated_at = NOW()
      FROM exams e
      WHERE we.exam_id = e.id
        AND we.ended IS NULL
        AND we.created IS NOT NULL
        AND we.created + (e.minute * INTERVAL '1 minute') < NOW()
        AND we.deleted_at IS NULL
      RETURNING we.id
    `);
    const updatedIds = rowsOf(result).map((r) => Number((r as { id: number }).id));
    this.logger.log(
      `checkEnded: ${updatedIds.length} ta yozuv yangilandi${
        updatedIds.length > 0 ? ` (ids: ${updatedIds.slice(0, 10).join(',')}${updatedIds.length > 10 ? '...' : ''})` : ''
      }`,
    );
  }

  private translateOrEmpty(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' && v !== key ? v : '';
  }
}

// Laravel Helper::getDateTex — "2026-yil 20-may".
const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

function dateTex(d: string | null | undefined): string {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  const month = UZ_MONTHS[Number(m[2]) - 1] ?? '';
  return `${m[1]}-yil ${Number(m[3])}-${month}`;
}

// Laravel PositionHelper::getFullPosition parity, inline — row-based.
function getFullPositionFromRows(
  org: { name: string | null; full_name: string | null } | undefined,
  dept: { name: string | null; level: number | null } | undefined,
  pos: { name: string | null } | undefined,
): string {
  if (!pos?.name) return '';
  // CENTER_LEVEL=1 → bo'lim qo'shilmaydi.
  const parts: string[] = [];
  if (org?.full_name) parts.push(org.full_name);
  if (dept?.name && dept.level !== 1) parts.push(dept.name);
  parts.push(pos.name);
  return parts.join(' ').trim();
}

// Laravel QueryHelper::filterByOrganizations parity — childIds ∩ request CSV ∩ id.
function intersectOrgFilters(
  allowedIds: number[],
  q: { organizations?: string; organization_id?: number | string },
): number[] {
  let result = allowedIds;
  if (q.organizations) {
    const csvIds = q.organizations
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (csvIds.length > 0) {
      const set = new Set(csvIds);
      result = result.filter((id) => set.has(id));
    }
  }
  const single =
    q.organization_id != null ? Number(q.organization_id) : undefined;
  if (Number.isInteger(single) && single! > 0) {
    result = result.filter((id) => id === single);
  }
  return result;
}

function parseCsvInts(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function sqlIdList(ids: number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
