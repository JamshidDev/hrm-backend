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
  departments,
  edu_plans,
  exams,
  groups,
  learning_centers,
  lms_certificates,
  lms_protocols,
  organizations,
  positions,
  worker_exams,
  worker_positions,
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

// Laravel ConfirmationStatusEnum int → i18n kalit so'zi (messages.confirmation.status.*).
const CONFIRMATION_WORDS: Record<number, string> = {
  1: 'process',
  2: 'read',
  3: 'success',
  4: 'rejected',
  5: 'deleted',
};

@Injectable()
export class LmsCertificateService {
  private readonly logger = new Logger(LmsCertificateService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /lms/certificates — Laravel: LmsCertificateController::certificates.
  //   Filtrlar: edu_plan_id, group_id, organization_id(wp), search(worker fullname OR
  //   number), year/month(cert_from), direction_id(edu_plan→spec→direction),
  //   specialization_id(edu_plan→spec). with: worker_position(+org,dept,position),
  //   worker. orderByDesc('number'). → CertificateResource.
  async list(q: CertificateListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(lms_certificates)];

    if (q.edu_plan_id)
      conditions.push(eq(lms_certificates.edu_plan_id, q.edu_plan_id));
    if (q.group_id) conditions.push(eq(lms_certificates.group_id, q.group_id));

    if (q.organization_id) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM worker_positions wp
        WHERE wp.id = ${lms_certificates.worker_position_id}
          AND wp.organization_id = ${q.organization_id}
      )`);
    }

    const search = q.search?.trim();
    if (search) {
      // worker.searchByFullName: termlar bo'sh joy bilan, har term last/first/middle
      //   ILIKE %term%, terms o'rtasida AND. OR number ILIKE search.
      const esc = (s: string) => s.replace(/[\\%_]/g, '\\$&');
      const terms = search.split(/\s+/).filter(Boolean);
      const termConds = terms.map((t) => {
        const p = `%${esc(t)}%`;
        return sql`(workers.last_name ILIKE ${p} OR workers.first_name ILIKE ${p} OR workers.middle_name ILIKE ${p})`;
      });
      const nameExists = sql`EXISTS (
        SELECT 1 FROM workers
        WHERE workers.id = ${lms_certificates.worker_id}
          AND ${sql.join(termConds, sql` AND `)}
      )`;
      const numberLike = sql`${lms_certificates.number}::text ILIKE ${search}`;
      conditions.push(sql`(${nameExists} OR ${numberLike})`);
    }

    if (q.year) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${lms_certificates.cert_from}) = ${q.year}`,
      );
    }
    if (q.month) {
      conditions.push(
        sql`EXTRACT(MONTH FROM ${lms_certificates.cert_from}) = ${q.month}`,
      );
    }
    if (q.direction_id) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM edu_plans ep
        JOIN specializations s ON s.id = ep.specialization_id
        WHERE ep.id = ${lms_certificates.edu_plan_id}
          AND s.direction_id = ${q.direction_id}
      )`);
    }
    if (q.specialization_id) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM edu_plans ep
        WHERE ep.id = ${lms_certificates.edu_plan_id}
          AND ep.specialization_id = ${q.specialization_id}
      )`);
    }

    const where = and(...conditions);
    const lang = this.ctx.lang;

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
          .orderBy(desc(lms_certificates.number))
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
        const wpIds = [
          ...new Set(
            rows
              .map((r) => r.worker_position_id)
              .filter((x): x is number => x != null),
          ),
        ];

        const [workerRows, wpRows] = await Promise.all([
          this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds.length ? workerIds : [-1])),
          this.db
            .select({
              id: worker_positions.id,
              organization_id: worker_positions.organization_id,
              department_id: worker_positions.department_id,
              position_id: worker_positions.position_id,
            })
            .from(worker_positions)
            .where(inArray(worker_positions.id, wpIds.length ? wpIds : [-1])),
        ]);

        const orgIds = [
          ...new Set(
            wpRows
              .map((w) => w.organization_id)
              .filter((x): x is number => !!x),
          ),
        ];
        const deptIds = [
          ...new Set(
            wpRows.map((w) => w.department_id).filter((x): x is number => !!x),
          ),
        ];
        const posIds = [
          ...new Set(
            wpRows.map((w) => w.position_id).filter((x): x is number => !!x),
          ),
        ];

        const [orgRows, deptRows, posRows] = await Promise.all([
          this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, orgIds.length ? orgIds : [-1])),
          this.db
            .select({
              id: departments.id,
              name: departments.name,
              level: departments.level,
            })
            .from(departments)
            .where(inArray(departments.id, deptIds.length ? deptIds : [-1])),
          this.db
            .select({
              id: positions.id,
              name: positions.name,
              name_ru: positions.name_ru,
              name_en: positions.name_en,
            })
            .from(positions)
            .where(inArray(positions.id, posIds.length ? posIds : [-1])),
        ]);

        const workerMap = new Map(workerRows.map((w) => [w.id, w]));
        const wpMap = new Map(wpRows.map((w) => [w.id, w]));
        const orgMap = new Map(orgRows.map((o) => [o.id, o]));
        const deptMap = new Map(deptRows.map((d) => [d.id, d]));
        const posMap = new Map(posRows.map((p) => [p.id, p]));

        // Photo + confirmation_file presigned URL (batch, parallel).
        const photoMap = new Map<number, string | null>();
        await Promise.all(
          workerRows.map(async (w) => {
            photoMap.set(w.id, await this.minio.fileUrl(w.photo));
          }),
        );
        const confFileUrls = await Promise.all(
          rows.map((r) => this.minio.fileUrl(r.confirmation_file)),
        );

        return rows.map((r, i) => {
          const word = CONFIRMATION_WORDS[r.confirmation];
          const confirmationName = word
            ? this.i18n.t(`messages.confirmation.status.${word}`, { lang })
            : null;
          return CertificateMapper.toItem({
            row: r,
            worker: r.worker_id ? (workerMap.get(r.worker_id) ?? null) : null,
            photo: r.worker_id ? (photoMap.get(r.worker_id) ?? null) : null,
            wp: r.worker_position_id
              ? (wpMap.get(r.worker_position_id) ?? null)
              : null,
            orgMap,
            deptMap,
            posMap,
            confirmationFileUrl: confFileUrls[i],
            confirmationName,
            lang,
          });
        });
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
    if (!row)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
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
        });
      }
    } else {
      const [{ next_id }] = (await this.db.execute(sql`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM lms_protocols
      `)) as unknown as Array<{ next_id: number | string }> & {
        rows?: Array<{ next_id: number | string }>;
      };
      const id = Number(
        Array.isArray(next_id) ? (next_id as any)[0] : (next_id ?? 0),
      );
      // The execute() return shape varies — use {rows} fallback.
      protocolId =
        Number.isFinite(id) && id > 0 ? id : await this.nextProtocolId();
      await this.db.insert(lms_protocols).values({
        id: protocolId,
        uuid: randomUUID(),
        ...protocolData,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
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
      const jsonBody = JSON.stringify({ ...dto, data: certInserts }, null, 2);
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

    return {
      success: true,
      protocol_id: protocolId,
      certificates: certInserts.length,
    };
  }

  // Fallback nextId for protocols when execute() shape is unclear.
  private async nextProtocolId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: sql<number>`COALESCE(MAX(id), 0)::int` })
      .from(lms_protocols);
    return Number(m ?? 0) + 1;
  }
}
