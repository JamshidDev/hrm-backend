// Certificates service. Laravel: LmsCertificateController.
//   GET    /lms/certificates             → paginated list
//   DELETE /lms/certificates/:id         → soft-delete (reject if confirmation=SUCCESS)
//   POST   /lms/certificate/generate     → protocol + certificate upsert + JSON dump

import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  edu_plans,
  exams,
  groups,
  learning_centers,
  lms_certificates,
  lms_protocols,
  worker_exams,
  workers,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { CertificateMapper } from '@/modules/lms/certificates/certificate.mapper';
import type {
  CertificateListQueryDto,
  GenerateCertificateDto,
} from '@/modules/lms/certificates/dto/certificate.dto';

// Laravel ConfirmationStatusEnum::SUCCESS = 2.
const CONFIRMATION_SUCCESS = 2;

@Injectable()
export class LmsCertificateService {
  private readonly logger = new Logger(LmsCertificateService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  async list(q: CertificateListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(lms_certificates)];
    if (q.edu_plan_id)
      conditions.push(eq(lms_certificates.edu_plan_id, q.edu_plan_id));
    if (q.group_id) conditions.push(eq(lms_certificates.group_id, q.group_id));
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: lms_certificates,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(lms_certificates)
          .where(where)
          .orderBy(desc(lms_certificates.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const workerIds = [
          ...new Set(
            rows.map((r) => r.worker_id).filter((x): x is number => x != null),
          ),
        ];
        const planIds = [
          ...new Set(
            rows
              .map((r) => r.edu_plan_id)
              .filter((x): x is number => x != null),
          ),
        ];

        const [workerRows, planRows] = await Promise.all([
          workerIds.length
            ? this.db
                .select({
                  id: workers.id,
                  last_name: workers.last_name,
                  first_name: workers.first_name,
                  middle_name: workers.middle_name,
                  photo: workers.photo,
                })
                .from(workers)
                .where(inArray(workers.id, workerIds))
            : Promise.resolve(
                [] as Array<{
                  id: number;
                  last_name: string | null;
                  first_name: string | null;
                  middle_name: string | null;
                  photo: string | null;
                }>,
              ),
          planIds.length
            ? this.db
                .select({ id: edu_plans.id, name: edu_plans.name })
                .from(edu_plans)
                .where(inArray(edu_plans.id, planIds))
            : Promise.resolve([] as Array<{ id: number; name: string | null }>),
        ]);

        const workerMap: Record<number, (typeof workerRows)[number]> = {};
        for (const w of workerRows) workerMap[w.id] = w;
        const planMap: Record<number, { id: number; name: string | null }> = {};
        for (const p of planRows) planMap[p.id] = p;

        return rows.map((r) => CertificateMapper.toItem(r, workerMap, planMap));
      },
    });
  }

  // DELETE /lms/certificates/:id — Laravel: destroy. Reject if confirmation=SUCCESS.
  async remove(id: number) {
    const [row] = await this.db
      .select({
        id: lms_certificates.id,
        confirmation: lms_certificates.confirmation,
      })
      .from(lms_certificates)
      .where(eq(lms_certificates.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    if (Number(row.confirmation) === CONFIRMATION_SUCCESS) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.does_not_delete_approved_document'),
      );
    }
    await this.db
      .update(lms_certificates)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(lms_certificates.id, id));
  }

  // POST /lms/certificate/generate — Laravel: LmsCertificateController::generateCertificate.
  //
  // Logic:
  //   1) Validate (DTO).
  //   2) Load group + learning_center.director_id (else 400 director_not_found).
  //   3) Load edu_plan (for serial).
  //   4) Upsert lms_protocol (find by protocol_id → update, else create).
  //   5) Load worker_exams (with exam.tests_count) for workers' worker_ids.
  //   6) For each worker in payload:
  //        a. Skip if existing certificate (worker_id, group_id) with confirmation=SUCCESS.
  //        b. Resolve start/end_exam_result (from start/end_exam_id → exam.tests_count + result,
  //           else from payload).
  //        c. Build row with uuid + file paths.
  //   7) Dump full payload JSON to MinIO at `json/lms/protocol/{protocol.id}.json`.
  //   8) UPSERT lms_certificates on (worker_id, group_id) unique key.
  //   9) DocumentReplace::generate(protocol) — Laravel DOCX generation. TODO: stub.
  async generate(dto: GenerateCertificateDto) {
    const userId = Number(this.ctx.user_or_fail.id);
    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);

    // 2) Load group + learning_center.
    const [grp] = await this.db
      .select({
        id: groups.id,
        edu_plan_id: groups.edu_plan_id,
        learning_center_id: groups.learning_center_id,
        director_id: learning_centers.director_id,
      })
      .from(groups)
      .leftJoin(
        learning_centers,
        eq(learning_centers.id, groups.learning_center_id),
      )
      .where(and(eq(groups.id, dto.group_id), notDeleted(groups)))
      .limit(1);
    if (!grp) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const directorId = grp.director_id;
    if (!directorId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.director_not_found'),
      );
    }
    const eduPlanId = Number(grp.edu_plan_id);

    // 3) Load edu_plan (for serial).
    const [eduPlan] = await this.db
      .select({ id: edu_plans.id, serial: edu_plans.serial })
      .from(edu_plans)
      .where(eq(edu_plans.id, eduPlanId))
      .limit(1);
    const serial = eduPlan ? Number(eduPlan.serial) : null;

    // 4) Upsert lms_protocol.
    const protocolData = {
      protocol_date: dto.protocol_date,
      cert_from: dto.cert_from,
      cert_to: dto.cert_to,
      edu_plan_id: eduPlanId,
      group_id: grp.id,
      organization_id: userOrgId,
    };
    let protocolId: number;
    if (dto.protocol_id) {
      protocolId = Number(dto.protocol_id);
      const upd = await this.db
        .update(lms_protocols)
        .set({ ...protocolData, updated_at: sql`NOW()` } as any)
        .where(eq(lms_protocols.id, protocolId))
        .returning({ id: lms_protocols.id });
      if (!upd.length) {
        // Fall back to create with provided id if missing (rare edge case).
        await this.db.insert(lms_protocols).values({
          id: protocolId,
          uuid: randomUUID(),
          ...protocolData,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        } as any);
      }
    } else {
      const [{ next_id }] = (await this.db.execute(sql`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM lms_protocols
      `)) as unknown as Array<{ next_id: number | string }> &
        { rows?: Array<{ next_id: number | string }> };
      const id = Number(
        Array.isArray(next_id) ? (next_id as any)[0] : next_id ?? 0,
      );
      // The execute() return shape varies — use {rows} fallback.
      protocolId = Number.isFinite(id) && id > 0 ? id : await this.nextProtocolId();
      await this.db.insert(lms_protocols).values({
        id: protocolId,
        uuid: randomUUID(),
        ...protocolData,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      } as any);
    }

    // 5) Load worker_exams (with exam.tests_count).
    const workerIds = [...new Set(dto.workers.map((w) => Number(w.worker_id)))];
    const weRows = workerIds.length
      ? await this.db
          .select({
            id: worker_exams.id,
            worker_id: worker_exams.worker_id,
            exam_id: worker_exams.exam_id,
            result: worker_exams.result,
            tests_count: exams.tests_count,
          })
          .from(worker_exams)
          .leftJoin(exams, eq(exams.id, worker_exams.exam_id))
          .where(inArray(worker_exams.worker_id, workerIds))
      : [];
    const weMap = new Map(weRows.map((r) => [Number(r.id), r] as const));

    // 6) Load existing certificates for this group (skip-if-SUCCESS check).
    const oldCerts = await this.db
      .select({
        worker_id: lms_certificates.worker_id,
        confirmation: lms_certificates.confirmation,
      })
      .from(lms_certificates)
      .where(
        and(
          eq(lms_certificates.group_id, grp.id),
          notDeleted(lms_certificates),
        ),
      );
    const skippedWorkerIds = new Set(
      oldCerts
        .filter((c) => Number(c.confirmation) === CONFIRMATION_SUCCESS)
        .map((c) => Number(c.worker_id)),
    );

    const certInserts: Array<Record<string, any>> = [];
    for (const w of dto.workers) {
      if (skippedWorkerIds.has(Number(w.worker_id))) continue;

      let startResult = w.start_exam_result ?? '';
      if (w.start_exam_id != null) {
        const we = weMap.get(Number(w.start_exam_id));
        if (we && we.tests_count != null) {
          startResult = `${we.tests_count}/${we.result ?? 0}`;
        }
      }
      let endResult = w.end_exam_result ?? '';
      if (w.end_exam_id != null) {
        const we = weMap.get(Number(w.end_exam_id));
        if (we && we.tests_count != null) {
          endResult = `${we.tests_count}/${we.result ?? 0}`;
        }
      }

      const uuid = randomUUID();
      certInserts.push({
        organization_id: userOrgId,
        edu_plan_worker_id: w.id ?? null,
        worker_id: Number(w.worker_id),
        worker_position_id: Number(w.worker_position_id),
        lms_protocol_id: protocolId,
        group_id: grp.id,
        edu_plan_id: eduPlanId,
        director_id: Number(directorId),
        cert_from: dto.cert_from,
        cert_to: dto.cert_to,
        start_exam_result: startResult,
        end_exam_result: endResult,
        serial: serial != null ? String(serial) : null,
        uuid,
        user_id: userId,
        file: `lms-certificate/${uuid}.docx`,
        confirmation_file: `documents/lms-certificate/${uuid}.pdf`,
      });
    }

    // 7) Dump full payload JSON to MinIO (Laravel parity).
    try {
      const jsonBody = JSON.stringify(
        { ...dto, data: certInserts },
        null,
        2,
      );
      await this.minio.putObject(
        `json/lms/protocol/${protocolId}.json`,
        Buffer.from(jsonBody, 'utf-8'),
        'application/json',
      );
    } catch (e) {
      this.logger.warn(
        `MinIO protocol JSON dump failed: ${(e as Error).message}`,
      );
    }

    // 8) UPSERT on (worker_id, group_id) unique key.
    if (certInserts.length) {
      // Each insert needs id — use MAX+1 sequentially.
      const [{ m }] = await this.db
        .select({ m: sql<number>`COALESCE(MAX(id), 0)::int` })
        .from(lms_certificates);
      let nextId = Number(m ?? 0);
      const rowsWithIds = certInserts.map((r) => {
        nextId += 1;
        return {
          ...r,
          id: nextId,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        };
      });

      // Drizzle insert with ON CONFLICT DO UPDATE on (worker_id, group_id).
      await this.db
        .insert(lms_certificates)
        .values(rowsWithIds as any)
        .onConflictDoUpdate({
          target: [lms_certificates.worker_id, lms_certificates.group_id],
          set: {
            worker_position_id: sql`EXCLUDED.worker_position_id`,
            director_id: sql`EXCLUDED.director_id`,
            cert_from: sql`EXCLUDED.cert_from`,
            cert_to: sql`EXCLUDED.cert_to`,
            lms_protocol_id: sql`EXCLUDED.lms_protocol_id`,
            edu_plan_id: sql`EXCLUDED.edu_plan_id`,
            start_exam_result: sql`EXCLUDED.start_exam_result`,
            end_exam_result: sql`EXCLUDED.end_exam_result`,
            serial: sql`EXCLUDED.serial`,
            number: sql`EXCLUDED.number`,
            user_id: sql`EXCLUDED.user_id`,
            organization_id: sql`EXCLUDED.organization_id`,
            updated_at: sql`NOW()`,
          },
        });
    }

    // 9) DOCX generation (Laravel: DocumentReplace::generate) — TODO.
    //    Implementing DOCX template replacement is out of scope for now;
    //    certificate rows include `file` and `confirmation_file` paths anyway.

    return { success: true, protocol_id: protocolId, certificates: certInserts.length };
  }

  // Fallback nextId for protocols when execute() shape is unclear.
  private async nextProtocolId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: sql<number>`COALESCE(MAX(id), 0)::int` })
      .from(lms_protocols);
    return Number(m ?? 0) + 1;
  }
}
