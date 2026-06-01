// Lessons service. Laravel: LessonController + LessonMeetController.
//
// index — Laravel `groupBy('lesson_date')` calendar shape qaytaradi (paginate EMAS):
//   [ { lesson_date, lessons: [ {id, name, group, subject, teacher, start_time,
//        end_time, exam} ] } ]
// Filter: learning_center_id (=) + lesson_date BETWEEN start_date..end_date.

import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, max, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  edu_plan_exams,
  edu_plans,
  exams,
  groups,
  lesson_participants,
  lessons,
  subjects,
  teachers,
  workers,
} from '@/db/schema';
import {
  CalendarDay,
  CalendarLessonItem,
  LessonExam,
  LessonTeacher,
  nullTeacher,
} from '@/modules/lms/lessons/lesson.mapper';
import type {
  LessonCalendarQueryDto,
  UpsertLessonDto,
} from '@/modules/lms/lessons/dto/lesson.dto';

@Injectable()
export class LmsLessonService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db.select({ m: max(lessons.id) }).from(lessons);
    return Number(m ?? 0) + 1;
  }

  // GET /lms/lessons — Laravel: LessonController::index (calendar).
  //
  //   Lesson::with(['group','subject','teacher.worker','exam.exam'])
  //     ->where('learning_center_id', $lc)
  //     ->whereBetween('lesson_date', [$start, $end])
  //     ->orderBy('lesson_date')->orderBy('start_time')->get()
  //     ->groupBy('lesson_date')->map(...);
  async calendar(q: LessonCalendarQueryDto): Promise<CalendarDay[]> {
    const where = and(
      eq(lessons.learning_center_id, q.learning_center_id),
      gte(lessons.lesson_date, q.start_date),
      lte(lessons.lesson_date, q.end_date),
      notDeleted(lessons),
    );

    const rows = await this.db
      .select({
        id: lessons.id,
        name: lessons.name,
        group_id: lessons.group_id,
        subject_id: lessons.subject_id,
        teacher_id: lessons.teacher_id,
        lesson_date: lessons.lesson_date,
        start_time: lessons.start_time,
        end_time: lessons.end_time,
      })
      .from(lessons)
      .where(where)
      .orderBy(asc(lessons.lesson_date), asc(lessons.start_time));

    if (!rows.length) return [];

    // ---- Batch-load relations (N+1 oldini olish) ----
    const groupIds = [...new Set(rows.map((r) => r.group_id))];
    const subjectIds = [...new Set(rows.map((r) => r.subject_id))];
    const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
    const lessonIds = rows.map((r) => r.id);

    const [groupRows, subjectRows, teacherRows, examLinks] = await Promise.all([
      this.db
        .select({ id: groups.id, code: groups.code })
        .from(groups)
        .where(inArray(groups.id, groupIds)),
      this.db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(inArray(subjects.id, subjectIds)),
      // teacher.worker — Teacher SoftDeletes ishlatadi, eager load deleted'ni chiqarib tashlaydi.
      this.db
        .select({ id: teachers.id, worker_id: teachers.worker_id })
        .from(teachers)
        .where(and(inArray(teachers.id, teacherIds), notDeleted(teachers))),
      // exam — hasOne(EduPlanExam, 'lesson_id'); EduPlanExam->exam belongsTo Exam.
      this.db
        .select({
          id: edu_plan_exams.id,
          lesson_id: edu_plan_exams.lesson_id,
          exam_id: edu_plan_exams.exam_id,
        })
        .from(edu_plan_exams)
        .where(
          and(
            inArray(edu_plan_exams.lesson_id, lessonIds),
            notDeleted(edu_plan_exams),
          ),
        )
        .orderBy(asc(edu_plan_exams.id)),
    ]);

    const workerIds = [...new Set(teacherRows.map((t) => t.worker_id))];
    const workerRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];

    const examIds = [
      ...new Set(
        examLinks.map((e) => e.exam_id).filter((x): x is number => !!x),
      ),
    ];
    const examRows = examIds.length
      ? await this.db
          .select({ id: exams.id, name: exams.name })
          .from(exams)
          .where(inArray(exams.id, examIds))
      : [];

    // ---- Maps ----
    const groupCode = new Map(groupRows.map((g) => [g.id, g.code]));
    const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));
    const teacherMap = new Map(teacherRows.map((t) => [t.id, t]));
    const workerMap = new Map(workerRows.map((w) => [w.id, w]));
    const examNameMap = new Map(examRows.map((e) => [e.id, e.name]));
    // hasOne — har lesson_id uchun BIRINCHI (eng kichik id) edu_plan_exam.
    const examByLesson = new Map<number, (typeof examLinks)[number]>();
    for (const link of examLinks) {
      if (link.lesson_id == null) continue;
      if (!examByLesson.has(link.lesson_id)) {
        examByLesson.set(link.lesson_id, link);
      }
    }

    // ---- Worker photolari uchun presigned URL (batch, parallel) ----
    const photoMap = new Map<number, string | null>();
    await Promise.all(
      workerRows.map(async (w) => {
        photoMap.set(w.id, await this.minio.fileUrl(w.photo));
      }),
    );

    const buildTeacher = (teacherId: number): LessonTeacher => {
      const t = teacherMap.get(teacherId);
      if (!t) return nullTeacher(); // soft-deleted / missing teacher
      const w = workerMap.get(t.worker_id);
      return {
        id: t.id,
        worker: {
          id: w?.id ?? null,
          photo: w ? (photoMap.get(w.id) ?? null) : null,
          last_name: w?.last_name ?? null,
          first_name: w?.first_name ?? null,
          middle_name: w?.middle_name ?? null,
        },
      };
    };

    const buildExam = (lessonId: number): LessonExam | null => {
      const link = examByLesson.get(lessonId);
      if (!link) return null;
      return {
        id: link.id,
        exam: {
          id: link.exam_id ?? null,
          name: link.exam_id ? (examNameMap.get(link.exam_id) ?? null) : null,
        },
      };
    };

    // ---- groupBy('lesson_date') — kun tartibini saqlab (lessonlar allaqachon sort) ----
    const calendar: CalendarDay[] = [];
    const dateIndex = new Map<string, number>();
    for (const r of rows) {
      const item: CalendarLessonItem = {
        id: r.id,
        name: r.name,
        group: groupCode.get(r.group_id) ?? null,
        subject: subjectName.get(r.subject_id) ?? null,
        teacher: buildTeacher(r.teacher_id),
        start_time: r.start_time,
        end_time: r.end_time,
        exam: buildExam(r.id),
      };
      let idx = dateIndex.get(r.lesson_date);
      if (idx === undefined) {
        idx = calendar.length;
        dateIndex.set(r.lesson_date, idx);
        calendar.push({ lesson_date: r.lesson_date, lessons: [] });
      }
      calendar[idx].lessons.push(item);
    }
    return calendar;
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, id), notDeleted(lessons)))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // POST /lms/lessons — Laravel: LessonController::store.
  //   1) EduPlan topilmasa 404.
  //   2) duration (soat) = (end - start) / 60 minut.
  //   3) edu_plan bo'yicha mavjud darslar umumiy soati + duration > hours → 422.
  //   4) Shu kunda start_time oralig'iga tushadigan darslar: o'sha o'qituvchi/guruh
  //      band bo'lsa 400.
  //
  // Eslatma (Laravel parity): Laravel'da `Lesson::where('edu_plan_id', 1)` HARDCODE
  // bug — biz to'g'ri `dto.edu_plan_id` ishlatamiz (hours-check mazmunli bo'lishi
  // uchun). Hamda Laravel MySQL `TIME_TO_SEC/TIMEDIFF` ishlatadi; PostgreSQL'da
  // `EXTRACT(EPOCH FROM (end_time - start_time))/3600` ekvivalenti.
  async create(dto: UpsertLessonDto) {
    const [eduPlan] = await this.db
      .select({ id: edu_plans.id, hours: edu_plans.hours })
      .from(edu_plans)
      .where(eq(edu_plans.id, dto.edu_plan_id))
      .limit(1);
    if (!eduPlan) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.lms.edu_plan_not_found'),
      );
    }

    const duration = this.durationHours(dto.start_time, dto.end_time);

    const [{ total }] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${lessons.end_time} - ${lessons.start_time})) / 3600), 0)`,
      })
      .from(lessons)
      .where(
        and(eq(lessons.edu_plan_id, dto.edu_plan_id), notDeleted(lessons)),
      );

    const totalHours = Number(total ?? 0);
    if (
      eduPlan.hours != null &&
      totalHours + duration > Number(eduPlan.hours)
    ) {
      throw new BusinessException(
        422,
        this.i18n.t('messages.lms.lesson.edu_plan_hours_exceeded'),
      );
    }

    // Shu kunda yangi start_time oralig'iga tushadigan darslar.
    const existLessons = await this.db
      .select({
        teacher_id: lessons.teacher_id,
        group_id: lessons.group_id,
      })
      .from(lessons)
      .where(
        and(
          eq(lessons.lesson_date, dto.lesson_date),
          sql`${lessons.start_time} <= ${dto.start_time}::time`,
          sql`${lessons.end_time} >= ${dto.start_time}::time`,
          notDeleted(lessons),
        ),
      );

    for (const ex of existLessons) {
      if (ex.teacher_id === dto.teacher_id) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.lms.lesson.already_teacher'),
        );
      }
      if (ex.group_id === dto.group_id) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.lms.lesson.already_group'),
        );
      }
    }

    const id = await this.nextId();
    await this.db.insert(lessons).values({
      id,
      learning_center_id: dto.learning_center_id,
      edu_plan_id: dto.edu_plan_id,
      group_id: dto.group_id,
      subject_id: dto.subject_id,
      teacher_id: dto.teacher_id,
      name: dto.name ?? null,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
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
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        lesson_date: dto.lesson_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        updated_at: sql`NOW()`,
      })
      .where(and(eq(lessons.id, id), notDeleted(lessons)))
      .returning({ id: lessons.id });
    if (!row) throw new BusinessException(404, 'not_found');
    return { id };
  }

  // DELETE /lms/lessons/:id — soft-delete (Laravel SoftDeletes RouteModelBinding).
  async remove(id: number) {
    const res = await this.db.execute(sql`
      UPDATE lessons
      SET deleted_at = NOW()
      WHERE id = ${id}
        AND deleted_at IS NULL
      RETURNING id
    `);
    const rows = ((res as any).rows ?? res) as Array<{ id: number | string }>;
    if (!rows.length) throw new BusinessException(404, 'not_found');
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

  // Carbon::parse(start)->diffInMinutes(parse(end)) / 60 ekvivalenti (soatda).
  private durationHours(start: string, end: string): number {
    const toMin = (t: string): number => {
      const [h = 0, m = 0, s = 0] = t.split(':').map((x) => Number(x) || 0);
      return h * 60 + m + s / 60;
    };
    return Math.abs(toMin(end) - toMin(start)) / 60;
  }
}
