// Teachers service. Laravel: TeacherController + TeacherLessonController.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  lessons,
  organizations,
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
  constructor(@InjectDb() private readonly db: DataSource) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(teachers.id) })
      .from(teachers);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/teachers — Laravel: with(worker, subjects, learning_center). */
  async list(q: TeacherListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(teachers)];
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
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(inArray(organizations.id, lcIds)),
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

  /** POST /lms/teachers. */
  async create(dto: UpsertTeacherDto) {
    const id = await this.nextId();
    await this.db.insert(teachers).values({
      id,
      learning_center_id: dto.learning_center_id,
      worker_id: dto.worker_id,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    return { id };
  }

  /** PUT /lms/teachers/:id. */
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
    return { id };
  }

  /** DELETE /lms/teachers/:id — soft-delete. */
  async remove(id: number) {
    const [row] = await this.db
      .update(teachers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(teachers.id, id))
      .returning({ id: teachers.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  /** GET /lms/teacher/lessons — stub (Laravel: complex). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async teacherLessons(_q: TeacherListQueryDto) {
    void lessons;
    return [];
  }
}
