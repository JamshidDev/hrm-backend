// Lessons service. Laravel: LessonController + LessonMeetController.
// Laravel index Calendar shape qaytaradi (groupBy('lesson_date')) — biz CRUD-style
// paginatsiya bilan boramiz (parity diff sifatida hujjatlanadi).

import { Injectable } from '@nestjs/common';
import { and, desc, eq, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { lesson_participants, lessons } from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { LessonMapper } from '@/modules/lms/lessons/lesson.mapper';
import type {
  LessonListQueryDto,
  UpsertLessonDto,
} from '@/modules/lms/lessons/dto/lesson.dto';

@Injectable()
export class LmsLessonService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db.select({ m: max(lessons.id) }).from(lessons);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/lessons — paginatsiya. Filter: edu_plan_id, group_id, teacher_id. */
  async list(q: LessonListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(lessons)];
    if (q.edu_plan_id) conditions.push(eq(lessons.edu_plan_id, q.edu_plan_id));
    if (q.group_id) conditions.push(eq(lessons.group_id, q.group_id));
    if (q.teacher_id) conditions.push(eq(lessons.teacher_id, q.teacher_id));
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: lessons,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(lessons)
          .where(where)
          .orderBy(desc(lessons.lesson_date))
          .limit(limit)
          .offset(offset),
      mapper: LessonMapper.toItem,
    });
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return LessonMapper.toItem(row);
  }

  async create(dto: UpsertLessonDto) {
    const id = await this.nextId();
    await this.db.insert(lessons).values({
      id,
      learning_center_id: dto.learning_center_id,
      edu_plan_id: dto.edu_plan_id,
      group_id: dto.group_id,
      subject_id: dto.subject_id,
      teacher_id: dto.teacher_id,
      name: dto.name ?? null,
      lesson_date: dto.lesson_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    return { id };
  }

  async update(id: number, dto: UpsertLessonDto) {
    const [row] = await this.db
      .update(lessons)
      .set({
        learning_center_id: dto.learning_center_id,
        edu_plan_id: dto.edu_plan_id,
        group_id: dto.group_id,
        subject_id: dto.subject_id,
        teacher_id: dto.teacher_id,
        name: dto.name ?? null,
        lesson_date: dto.lesson_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        updated_at: sql`NOW()`,
      })
      .where(eq(lessons.id, id))
      .returning({ id: lessons.id });
    if (!row) throw new BusinessException(404, 'not_found');
    return { id };
  }

  async remove(id: number) {
    const [row] = await this.db
      .update(lessons)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(lessons.id, id))
      .returning({ id: lessons.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  async showParticipants(lessonId: number) {
    const rows = await this.db
      .select()
      .from(lesson_participants)
      .where(
        and(
          eq(lesson_participants.lesson_id, lessonId),
          notDeleted(lesson_participants),
        ),
      )
      .orderBy(desc(lesson_participants.joined_at));
    return rows.map((r) => ({
      id: r.id,
      lesson_id: r.lesson_id,
      worker_id: r.worker_id,
      joined_at: r.joined_at,
    }));
  }

  async createZoomMeeting(lessonId: number) {
    const [row] = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return { success: true, stub: true, url: '', meeting_id: '' };
  }
}
