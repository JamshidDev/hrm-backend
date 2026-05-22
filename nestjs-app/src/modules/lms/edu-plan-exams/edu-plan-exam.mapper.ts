// EduPlanExam mapper. Laravel: EduPlanExamMinResource — {id, exam: {id, name}}.

import type { edu_plan_exams } from '@/db/schema';

type Row = typeof edu_plan_exams.$inferSelect;

export interface EduPlanExamItem {
  id: number;
  exam: { id: number | null; name: string | null };
}

export const EduPlanExamMapper = {
  toItem(
    r: Row,
    examMap: Record<number, { id: number; name: string | null }>,
  ): EduPlanExamItem {
    const e = examMap[r.exam_id];
    return {
      id: r.id,
      exam: { id: e?.id ?? null, name: e?.name ?? null },
    };
  },
};
