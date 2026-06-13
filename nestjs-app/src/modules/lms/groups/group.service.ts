// Groups service. Laravel: GroupController + LmsProtocolController.
// /lms/groups → list (NOT paginated!).
// /lms/group-workers → paginated nested.
// /lms/protocol → paginated with formatted number.
// /lms/worker-exams → paginated stub.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  sql,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  departments,
  edu_plan_workers,
  edu_plans,
  exams,
  group_workers,
  groups,
  learning_centers,
  lms_certificates,
  lms_protocols,
  organizations,
  positions,
  topics,
  worker_exams,
  worker_positions,
  workers,
} from '@/db/schema';
import { examWhomName } from '@/modules/exam/_shared/enums';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { GroupMapper, ProtocolMapper } from '@/modules/lms/groups/group.mapper';
import type {
  DetachGroupWorkersDto,
  GenerateGroupsDto,
  GroupListQueryDto,
} from '@/modules/lms/groups/dto/group.dto';

@Injectable()
export class LmsGroupService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // Laravel: GroupController::generateGroups.
  //
  //  1) Validate edu_plan_id, load EduPlan + learning_center + workers (edu_plan_workers).
  //  2) Shuffle workers.
  //  3) Load existing groups for edu_plan; if empty → create `count_groups`
  //     new ones (code = (MAX(code) WHERE learning_center_id=...) + 1, incremented per loop).
  //  4) Filter out workers already assigned to a group (group_id IS NOT NULL).
  //  5) For each group: needed = count_workers - currentCount; assign first `needed`
  //     workers to that group (UPDATE edu_plan_workers SET group_id = group.id).
  async generate(dto: GenerateGroupsDto) {
    if (!dto.edu_plan_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.lms.edu_plan_not_found'),
      );
    }

    // 1) Load edu_plan + learning_center.
    const [ep] = await this.db
      .select({
        id: edu_plans.id,
        learning_center_id: edu_plans.learning_center_id,
        count_groups: edu_plans.count_groups,
        count_workers: edu_plans.count_workers,
        lc_code: learning_centers.code,
      })
      .from(edu_plans)
      .leftJoin(
        learning_centers,
        eq(learning_centers.id, edu_plans.learning_center_id),
      )
      .where(and(eq(edu_plans.id, dto.edu_plan_id), notDeleted(edu_plans)))
      .limit(1);
    if (!ep) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.lms.edu_plan_not_found'),
      );
    }

    // 2) Load all edu_plan_workers (id, group_id) for shuffle + assignment tracking.
    const epwRows = await this.db
      .select({
        id: edu_plan_workers.id,
        worker_id: edu_plan_workers.worker_id,
        group_id: edu_plan_workers.group_id,
      })
      .from(edu_plan_workers)
      .where(
        and(
          eq(edu_plan_workers.edu_plan_id, ep.id),
          notDeleted(edu_plan_workers),
        ),
      );

    // 3) Load existing groups for edu_plan; create count_groups new ones if none exist.
    const existingGroups = await this.db
      .select({ id: groups.id, code: groups.code })
      .from(groups)
      .where(and(eq(groups.edu_plan_id, ep.id), notDeleted(groups)))
      .orderBy(asc(groups.id));

    const groupList: Array<{ id: number; code: number }> = [...existingGroups];

    if (!groupList.length) {
      // MAX(code) for this learning_center (across all edu_plans).
      const [{ maxCode }] = await this.db
        .select({ maxCode: max(groups.code) })
        .from(groups)
        .where(eq(groups.learning_center_id, Number(ep.learning_center_id)));
      let nextCode = Number(maxCode ?? 0);
      const lcCode = String(ep.lc_code ?? '');

      // Sequential nextId for groups table (Laravel: PG sequence, but our pattern is MAX+1).
      const [{ m }] = await this.db.select({ m: max(groups.id) }).from(groups);
      let nextGroupId = Number(m ?? 0);

      const totalGroups = Number(ep.count_groups ?? 1);
      const inserts: Array<{
        id: number;
        learning_center_id: number;
        edu_plan_id: number;
        code: number;
        name: string;
      }> = [];
      for (let i = 1; i <= totalGroups; i++) {
        nextCode += 1;
        nextGroupId += 1;
        inserts.push({
          id: nextGroupId,
          learning_center_id: Number(ep.learning_center_id),
          edu_plan_id: ep.id,
          code: nextCode,
          name: `M${lcCode} ${i}-guruh`,
        });
        groupList.push({ id: nextGroupId, code: nextCode });
      }
      if (inserts.length) {
        await this.db.insert(groups).values(
          inserts.map((g) => ({
            ...g,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
      }
    }

    // 4) Workers already assigned to any group — exclude from pool.
    const assigned = new Set(
      epwRows.filter((r) => r.group_id != null).map((r) => Number(r.worker_id)),
    );
    const pool = epwRows
      .filter((r) => !assigned.has(Number(r.worker_id)))
      .map((r) => ({ id: r.id, worker_id: r.worker_id }));

    // Shuffle (Fisher-Yates) — Laravel `$workers->shuffle()`.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 5) Distribute pool across groups.
    const countWorkersPerGroup = Number(ep.count_workers ?? 30);
    let cursor = 0;
    for (const g of groupList) {
      // Current count for this group.
      const current = epwRows.filter((r) => Number(r.group_id) === g.id).length;
      const needed = countWorkersPerGroup - current;
      if (needed <= 0) continue;
      const slice = pool.slice(cursor, cursor + needed);
      cursor += slice.length;
      if (!slice.length) continue;
      // UPDATE edu_plan_workers SET group_id = g.id WHERE id IN slice.ids.
      await this.db
        .update(edu_plan_workers)
        .set({ group_id: g.id, updated_at: sql`NOW()` })
        .where(
          inArray(
            edu_plan_workers.id,
            slice.map((s) => Number(s.id)),
          ),
        );
      if (cursor >= pool.length) break;
    }

    return { success: true, groups: groupList.length, assigned: cursor };
  }

  // POST /lms/detach-workers-in-group.
  //
  // Laravel: detachWorkersInGroups — har doim 400 `does_not_delete_related_item`
  // qaytaradi (return ostidan keyin actual delete code dead-code). Parity uchun
  // bizda ham hard-block.
  detachWorkers(_dto: DetachGroupWorkersDto) {
    throw new BusinessException(
      400,
      this.i18n.t('messages.does_not_delete_related_item'),
    );
  }

  /**
   * GET /lms/groups — Laravel: array qaytaradi (paginatsiyasiz).
   *
   * Filter: edu_plan_id (Laravel'da MAJBURIY).
   * GroupListResource shape: { id, code: 'M{lc.code} {group.code}-guruh', workers: count }
   *  - code: Laravel `Group::getCode($learning_center)` — "M{lc.code} {group.code}-guruh"
   *  - workers: BelongsToMany via `edu_plan_workers` (Laravel: `withCount('workers')`)
   */
  async list(q: GroupListQueryDto) {
    const conditions = [notDeleted(groups)];
    // Laravel: where('edu_plan_id', $request->edu_plan_id) — yo'q bo'lsa IS NULL.
    conditions.push(
      q.edu_plan_id
        ? eq(groups.edu_plan_id, q.edu_plan_id)
        : isNull(groups.edu_plan_id),
    );
    const where = and(...conditions);

    const rows = await this.db
      .select({
        id: groups.id,
        code: groups.code,
        name: groups.name,
        learning_center_id: groups.learning_center_id,
        edu_plan_id: groups.edu_plan_id,
        lc_code: learning_centers.code,
      })
      .from(groups)
      .leftJoin(
        learning_centers,
        eq(learning_centers.id, groups.learning_center_id),
      )
      .where(where)
      .orderBy(desc(groups.id));

    if (!rows.length) return [];

    const groupIds = rows.map((g) => g.id);
    // Laravel `Group::workers()` is belongsToMany via edu_plan_workers — count DISTINCT worker_id.
    const wCount = await this.db
      .select({
        group_id: edu_plan_workers.group_id,
        total: sql<number>`COUNT(DISTINCT ${edu_plan_workers.worker_id})::int`,
      })
      .from(edu_plan_workers)
      .where(
        and(
          inArray(edu_plan_workers.group_id, groupIds),
          notDeleted(edu_plan_workers),
        ),
      )
      .groupBy(edu_plan_workers.group_id);

    const workersCount: Record<number, number> = {};
    for (const w of wCount) {
      if (w.group_id != null) workersCount[w.group_id] = Number(w.total);
    }

    return rows.map((r) =>
      GroupMapper.toListItem(
        { id: r.id, code: r.code, lc_code: r.lc_code },
        workersCount,
      ),
    );
  }

  // GET /lms/group-workers — Laravel: GroupController::groupWorkers.
  //
  // Query: edu_plan_workers WHERE group_id=$X (NOT `group_workers` jadval!)
  // Eager-load: worker (id, last/first/middle/photo), worker_position (id, organization_id,
  //             department_id, position_id) → department (id, name, level), organization
  //             (id, name, full_name), position (id, name); certificate (lms_certificates hasOne).
  // GroupWorkersResource: { id, worker, position (short), worker_position_id, certificate }
  async groupWorkers(q: GroupListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conds = [notDeleted(edu_plan_workers)];
    if (q.group_id) {
      conds.push(eq(edu_plan_workers.group_id, q.group_id));
    }
    // Laravel: when(protocol_id, whereDoesntHave('certificate')) — protocol_id
    // berilgan bo'lsa, FAQAT sertifikati YO'Q xodimlar (hasOne edu_plan_worker_id).
    if (q.protocol_id) {
      conds.push(
        sql`NOT EXISTS (
          SELECT 1 FROM lms_certificates c
          WHERE c.edu_plan_worker_id = ${edu_plan_workers.id}
            AND c.deleted_at IS NULL
        )`,
      );
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: edu_plan_workers.id,
          worker_id: edu_plan_workers.worker_id,
          worker_position_id: edu_plan_workers.worker_position_id,
        })
        .from(edu_plan_workers)
        .where(where)
        .orderBy(asc(edu_plan_workers.id))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.select({ total: count() }).from(edu_plan_workers).where(where),
    ]);

    if (!rows.length) {
      return { current_page: page, total: Number(total), data: [] };
    }

    // Batch loads.
    const workerIds = [
      ...new Set(rows.map((r) => Number(r.worker_id)).filter(Boolean)),
    ];
    const wpIds = [
      ...new Set(rows.map((r) => Number(r.worker_position_id)).filter(Boolean)),
    ];

    const [wRows, wpRows] = await Promise.all([
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
        : Promise.resolve([] as any[]),
      wpIds.length
        ? this.db
            .select({
              id: worker_positions.id,
              organization_id: worker_positions.organization_id,
              department_id: worker_positions.department_id,
              position_id: worker_positions.position_id,
            })
            .from(worker_positions)
            .where(inArray(worker_positions.id, wpIds))
        : Promise.resolve([] as any[]),
    ]);

    const depIds = [
      ...new Set(wpRows.map((r) => Number(r.department_id)).filter(Boolean)),
    ];
    const posIds = [
      ...new Set(wpRows.map((r) => Number(r.position_id)).filter(Boolean)),
    ];
    const wpOrgIds = [
      ...new Set(wpRows.map((r) => Number(r.organization_id)).filter(Boolean)),
    ];

    const [dRows, pRows, wpOrgRows, certRows] = await Promise.all([
      depIds.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              level: departments.level,
            })
            .from(departments)
            .where(inArray(departments.id, depIds))
        : Promise.resolve([] as any[]),
      posIds.length
        ? this.db
            .select({ id: positions.id, name: positions.name })
            .from(positions)
            .where(inArray(positions.id, posIds))
        : Promise.resolve([] as any[]),
      wpOrgIds.length
        ? this.db
            .select({
              id: organizations.id,
              full_name: organizations.full_name,
            })
            .from(organizations)
            .where(inArray(organizations.id, wpOrgIds))
        : Promise.resolve([] as any[]),
      // certificate: lms_certificates hasOne edu_plan_worker_id
      this.db
        .select({
          id: lms_certificates.id,
          edu_plan_worker_id: lms_certificates.edu_plan_worker_id,
          cert_from: lms_certificates.cert_from,
          cert_to: lms_certificates.cert_to,
          serial: lms_certificates.serial,
          number: lms_certificates.number,
          start_exam_result: lms_certificates.start_exam_result,
          end_exam_result: lms_certificates.end_exam_result,
          confirmation_file: lms_certificates.confirmation_file,
          generate: lms_certificates.generate,
          confirmation: lms_certificates.confirmation,
        })
        .from(lms_certificates)
        .where(
          and(
            inArray(
              lms_certificates.edu_plan_worker_id,
              rows.map((r) => Number(r.id)),
            ),
            notDeleted(lms_certificates),
          ),
        ),
    ]);

    const wPhotoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: wPhotoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );
    const wpMap = new Map(wpRows.map((wp) => [Number(wp.id), wp] as const));
    const dMap = new Map(dRows.map((d) => [Number(d.id), d] as const));
    const pMap = new Map(pRows.map((p) => [Number(p.id), p] as const));
    const wpOrgFullMap = new Map(
      wpOrgRows.map(
        (o) => [Number(o.id), o.full_name as string | null] as const,
      ),
    );
    const certMap = new Map(
      (certRows as any[]).map(
        (c) => [Number(c.edu_plan_worker_id), c] as const,
      ),
    );
    // confirmation_file presigned URL'lar (batch) — Laravel Helper::fileUrl.
    const certFileUrls = await Promise.all(
      (certRows as any[]).map((c) =>
        c.confirmation_file
          ? this.minio.fileUrl(c.confirmation_file as string)
          : Promise.resolve(null),
      ),
    );
    const certFileMap = new Map(
      (certRows as any[]).map(
        (c, i) => [Number(c.edu_plan_worker_id), certFileUrls[i]] as const,
      ),
    );
    // ConfirmationStatusEnum → i18n label (1=process..5=deleted).
    const confWord: Record<number, string> = {
      1: 'process',
      2: 'read',
      3: 'success',
      4: 'rejected',
      5: 'deleted',
    };
    const confName = (v: number | null): string => {
      const w = v != null ? confWord[v] : undefined;
      return w ? this.i18n.t(`messages.confirmation.status.${w}`) : '';
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const wp = r.worker_position_id
          ? wpMap.get(Number(r.worker_position_id))
          : null;
        const pos =
          wp && wp.position_id ? pMap.get(Number(wp.position_id)) : null;
        const dep =
          wp && wp.department_id ? dMap.get(Number(wp.department_id)) : null;
        const orgFull =
          wp && wp.organization_id
            ? (wpOrgFullMap.get(Number(wp.organization_id)) ?? null)
            : null;
        const cert = certMap.get(Number(r.id));
        return {
          id: Number(r.id),
          worker: r.worker_id ? (wMap.get(Number(r.worker_id)) ?? null) : null,
          position: getShortPosition({
            position_name: pos?.name ?? null,
            department_name: dep?.name ?? null,
            department_level: dep?.level ?? null,
            organization_full_name: orgFull,
          }),
          worker_position_id: r.worker_position_id,
          certificate: cert
            ? {
                id: Number(cert.id),
                cert_from: cert.cert_from,
                cert_to: cert.cert_to,
                serial: cert.serial,
                number: cert.number,
                start_exam_result: cert.start_exam_result,
                end_exam_result: cert.end_exam_result,
                confirmation_file: certFileMap.get(Number(r.id)) ?? null,
                generate: cert.generate,
                confirmation: {
                  id: cert.confirmation,
                  name: confName(cert.confirmation),
                },
              }
            : null,
        };
      }),
    };
  }

  /** GET /lms/protocol — paginatsiya formatted number bilan. */
  async protocol(q: GroupListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = notDeleted(lms_protocols);

    return lmsPaginate({
      db: this.db,
      countTable: lms_protocols,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(lms_protocols)
          .where(where)
          .orderBy(desc(lms_protocols.id))
          .limit(limit)
          .offset(offset),
      mapper: ProtocolMapper.toItem,
    });
  }

  // GET /lms/worker-exams — Laravel GroupController::workerExams.
  //   WorkerExam where worker_id=request, ended NOT NULL, whereHas(exam.topic),
  //   with(exam.topic), orderByDesc(id), paginate → WorkerExamResource:
  //   {id, created, ended, result, exam: ExamResource}.
  async workerExams(q: GroupListQueryDto) {
    const { page, perPage } = readPaging(q);
    const workerId = Number((q as { worker_id?: number | string }).worker_id);

    const where = and(
      notDeleted(worker_exams),
      workerId ? eq(worker_exams.worker_id, workerId) : sql`FALSE`,
      isNotNull(worker_exams.ended),
      // whereHas('exam', whereHas('topic')) — exam + topic mavjud bo'lishi shart.
      sql`EXISTS (
        SELECT 1 FROM exams e JOIN topics t ON t.id = e.topic_id
        WHERE e.id = ${worker_exams.exam_id} AND t.deleted_at IS NULL
      )`,
    );

    return lmsPaginate({
      db: this.db,
      countTable: worker_exams,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: worker_exams.id,
            created: worker_exams.created,
            ended: worker_exams.ended,
            result: worker_exams.result,
            exam_id: worker_exams.exam_id,
            e_name: exams.name,
            e_whom: exams.whom,
            e_deadline: exams.deadline,
            e_variant: exams.variant,
            e_minute: exams.minute,
            e_tests_count: exams.tests_count,
            e_chances: exams.chances,
            e_active: exams.active,
            e_description: exams.description,
            t_id: topics.id,
            t_name: topics.name,
          })
          .from(worker_exams)
          .leftJoin(exams, eq(exams.id, worker_exams.exam_id))
          .leftJoin(topics, eq(topics.id, exams.topic_id))
          .where(where)
          .orderBy(desc(worker_exams.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      // eslint-disable-next-line @typescript-eslint/require-await
      mapList: async (rows: Record<string, unknown>[]) =>
        rows.map((r) => ({
          id: r.id,
          created: r.created,
          ended: r.ended,
          result: r.result,
          exam: r.exam_id
            ? {
                id: r.exam_id,
                name: r.e_name,
                whom: {
                  id: r.e_whom,
                  name: examWhomName(Number(r.e_whom)),
                },
                topic: r.t_id ? { id: r.t_id, name: r.t_name } : null,
                deadline: r.e_deadline,
                variant: r.e_variant,
                minute: r.e_minute,
                tests_count: r.e_tests_count,
                chances: r.e_chances,
                active: r.e_active,
                description: r.e_description,
              }
            : null,
        })),
    });
  }
}
