// EduPlan mapper. Laravel: EduPlanListResource.
// Shape: {id, name, learning_center, specialization, subjects, type: {id,name},
//         start_date, hours, count_groups, count_workers, workers_count, exams_count}

import type { edu_plans } from '@/db/schema';

type Row = typeof edu_plans.$inferSelect;

const EDU_PLAN_TYPE_NAMES: Record<number, string> = {
  1: 'Malaka oshirish',
  2: 'Qayta tayyorlash',
};

interface Brief {
  id: number;
  name: string | null;
}

export interface EduPlanListItem {
  id: number;
  name: string | null;
  learning_center: Brief | null;
  specialization: Brief | null;
  subjects: Brief[];
  type: { id: number; name: string };
  start_date: string | null;
  hours: number | null;
  count_groups: number | null;
  count_workers: number | null;
  workers_count: number;
  exams_count: number;
}

export const EduPlanMapper = {
  toListItem(
    r: Row,
    lcMap: Record<number, Brief>,
    specMap: Record<number, Brief>,
    subjectsByPlan: Record<number, Brief[]>,
    workersCount: Record<number, number>,
    examsCount: Record<number, number>,
  ): EduPlanListItem {
    return {
      id: r.id,
      name: r.name,
      learning_center: lcMap[r.learning_center_id] ?? null,
      specialization: specMap[r.specialization_id] ?? null,
      subjects: subjectsByPlan[r.id] ?? [],
      type: {
        id: r.type,
        name: EDU_PLAN_TYPE_NAMES[r.type] ?? 'Unknown',
      },
      start_date: r.start_date,
      hours: r.hours,
      count_groups: r.count_groups,
      count_workers: r.count_workers,
      workers_count: workersCount[r.id] ?? 0,
      exams_count: examsCount[r.id] ?? 0,
    };
  },
};
