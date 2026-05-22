// Lesson mapper. Laravel: LessonController index → calendar-style guruh.
// Bizda CRUD-style brief mapper saqlanadi:
//   {id, name, lesson_date, start_time, end_time, group_id, subject_id, teacher_id}

import type { lessons } from '@/db/schema';

type Row = typeof lessons.$inferSelect;

export interface LessonItem {
  id: number;
  name: string | null;
  lesson_date: string;
  start_time: string;
  end_time: string;
  group_id: number;
  subject_id: number;
  teacher_id: number;
  edu_plan_id: number;
}

export const LessonMapper = {
  toItem: (r: Row): LessonItem => ({
    id: r.id,
    name: r.name,
    lesson_date: r.lesson_date,
    start_time: r.start_time,
    end_time: r.end_time,
    group_id: r.group_id,
    subject_id: r.subject_id,
    teacher_id: r.teacher_id,
    edu_plan_id: r.edu_plan_id,
  }),
};
