// Teachers service. Laravel: TeacherController + TeacherLessonController.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import {
  learning_center_users,
  learning_centers,
  lessons,
  subjects,
  teacher_subjects,
  teachers,
  workers,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { TeacherMapper } from '@/modules/lms/teachers/teacher.mapper';
import type {
  TeacherListQueryDto,
  UpsertTeacherDto,
} from '@/modules/lms/teachers/dto/teacher.dto';

@Injectable()
export class LmsTeacherService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(teachers.id) })
      .from(teachers);
    return Number(m ?? 0) + 1;
  }

  // GET /lms/teachers — Laravel: TeacherController::index.
  //
  //   Teacher::query()
  //     ->whereHas('subjects', fn $q => $q->whereIn(
  //         'teacher_subjects.learning_center_id',
  //         LearningCenterUser::where('user_id', auth()->id())
  //             ->pluck('learning_center_id')
  //     ))
  //     ->with(['worker', 'subjects', 'learning_center'])
  //     ->paginate(per_page);
  async list(q: TeacherListQueryDto) {
    const { page, perPage } = readPaging(q);
    const userId = Number(this.ctx.user?.id ?? 0);

    // EXISTS teacher_subjects row with learning_center_id IN (user's centers).
    const userCentersExists = sql`EXISTS (
      SELECT 1 FROM teacher_subjects ts
      WHERE ts.teacher_id = ${teachers.id}
        AND ts.learning_center_id IN (
          SELECT learning_center_id FROM learning_center_users
          WHERE user_id = ${userId}
            AND deleted_at IS NULL
        )
    )`;

    const conditions = [notDeleted(teachers), userCentersExists];
    if (q.learning_center_id) {
      conditions.push(eq(teachers.learning_center_id, q.learning_center_id));
    }
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: teachers,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(teachers)
          .where(where)
          .orderBy(desc(teachers.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const teacherIds = rows.map((r) => r.id);
        const workerIds = [...new Set(rows.map((r) => r.worker_id))];
        const lcIds = [...new Set(rows.map((r) => r.learning_center_id))];

        const [workerRows, tsLinks, lcRows] = await Promise.all([
          this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds)),
          this.db
            .select({
              teacher_id: teacher_subjects.teacher_id,
              subject_id: teacher_subjects.subject_id,
            })
            .from(teacher_subjects)
            .where(inArray(teacher_subjects.teacher_id, teacherIds)),
          this.db
            .select({ id: learning_centers.id, name: learning_centers.name })
            .from(learning_centers)
            .where(inArray(learning_centers.id, lcIds)),
        ]);

        const subjectIds = [...new Set(tsLinks.map((t) => t.subject_id))];
        const subjectRows = subjectIds.length
          ? await this.db
              .select({ id: subjects.id, name: subjects.name })
              .from(subjects)
              .where(inArray(subjects.id, subjectIds))
          : [];
        const subjectMap: Record<number, { id: number; name: string }> = {};
        for (const s of subjectRows) subjectMap[s.id] = s;

        const subjectsByTeacher: Record<
          number,
          { id: number; name: string }[]
        > = {};
        for (const link of tsLinks) {
          const s = subjectMap[link.subject_id];
          if (!s) continue;
          (subjectsByTeacher[link.teacher_id] ??= []).push(s);
        }

        const workerMap: Record<number, (typeof workerRows)[number]> = {};
        for (const w of workerRows) workerMap[w.id] = w;

        const lcMap: Record<number, { id: number; name: string | null }> = {};
        for (const lc of lcRows) lcMap[lc.id] = lc;

        return rows.map((r) =>
          TeacherMapper.toListItem(r, workerMap, subjectsByTeacher, lcMap),
        );
      },
    });
  }

  /** GET /lms/teachers/:id — bitta o'qituvchi (brief). */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(teachers)
      .where(eq(teachers.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const [worker] = row.worker_id
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
          })
          .from(workers)
          .where(eq(workers.id, row.worker_id))
          .limit(1)
      : [];

    const workerMap: Record<number, typeof worker> = {};
    if (worker) workerMap[worker.id] = worker;
    return TeacherMapper.toMinItem(row, workerMap);
  }

  // POST /lms/teachers — Laravel: `Teacher::updateOrCreate({lc, worker}, {})` + sync subjects.
  async create(dto: UpsertTeacherDto) {
    const id = await this.upsertTeacher(dto.learning_center_id, dto.worker_id);
    if (dto.subjects?.length) {
      await this.syncSubjects(id, dto.learning_center_id, dto.subjects);
    }
    return { id };
  }

  // PUT /lms/teachers/:id — Laravel'da resource update aniq endpoint emas, lekin
  // controller `apiResource` deb belgilangan. Mavjud teacher'ni topib, lc/worker
  // o'zgartirmasdan faqat subjects ni sync qiladi (frontend bu endpointni kamdan-kam
  // ishlatadi — odatda POST /lms/teachers updateOrCreate kifoya).
  async update(id: number, dto: UpsertTeacherDto) {
    const [row] = await this.db
      .update(teachers)
      .set({
        learning_center_id: dto.learning_center_id,
        worker_id: dto.worker_id,
        updated_at: sql`NOW()`,
      })
      .where(eq(teachers.id, id))
      .returning({ id: teachers.id });
    if (!row) throw new BusinessException(404, 'not_found');
    if (dto.subjects !== undefined) {
      await this.syncSubjects(id, dto.learning_center_id, dto.subjects);
    }
    return { id };
  }

  // DELETE /lms/teachers/:id — soft-delete (Laravel uses SoftDeletes; pivot stays).
  async remove(id: number) {
    const [row] = await this.db
      .update(teachers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(teachers.id, id))
      .returning({ id: teachers.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // Laravel `updateOrCreate({learning_center_id, worker_id})`:
  //   Mavjud (har qanday holatda) → id qaytaradi (touch updated_at, deleted_at=NULL).
  //   Yo'q bo'lsa → MAX+1 ID bilan create.
  //
  // Note: raw SQL ishlatamiz chunki Drizzle bigint (mode: 'number') eq()'da
  // ba'zan SELECT 0 ta row qaytaradi (param type coercion bug).
  private async upsertTeacher(
    learningCenterId: number,
    workerId: number,
  ): Promise<number> {
    const res = await this.db.execute(sql`
      SELECT id FROM teachers
      WHERE learning_center_id = ${learningCenterId}
        AND worker_id = ${workerId}
      LIMIT 1
    `);
    const existingRows = ((res as any).rows ?? res) as Array<{ id: number | string }>;
    if (existingRows.length) {
      const existingId = Number(existingRows[0].id);
      await this.db.execute(sql`
        UPDATE teachers
        SET updated_at = NOW(), deleted_at = NULL
        WHERE id = ${existingId}
      `);
      return existingId;
    }
    const id = await this.nextId();
    await this.db.insert(teachers).values({
      id,
      learning_center_id: learningCenterId,
      worker_id: workerId,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    } as any);
    return id;
  }

  // Laravel: `$teacher->subjects()->sync($syncData)` — pivot bilan learning_center_id.
  // teacher_subjects (teacher_id, subject_id, learning_center_id) — delete-then-insert.
  private async syncSubjects(
    teacherId: number,
    learningCenterId: number,
    subjectIds: number[] | undefined,
  ): Promise<void> {
    await this.db
      .delete(teacher_subjects)
      .where(eq(teacher_subjects.teacher_id, teacherId));
    const ids = [
      ...new Set(
        (subjectIds ?? [])
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ];
    if (!ids.length) return;
    await this.db.insert(teacher_subjects).values(
      ids.map((sid) => ({
        teacher_id: teacherId,
        subject_id: sid,
        learning_center_id: learningCenterId,
      })),
    );
  }

  /** GET /lms/teacher/lessons — stub (Laravel: complex). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async teacherLessons(_q: TeacherListQueryDto) {
    void lessons;
    return [];
  }
}
