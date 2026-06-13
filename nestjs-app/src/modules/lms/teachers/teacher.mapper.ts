// Teacher mapper. Laravel parity (TeacherListResource):
//   {id, worker: WorkerMinimal, subjects: [{id, name}], learning_center: {...}}

import type { teachers } from '@/db/schema';
import {
  WorkerBriefMapper,
  type WorkerBrief,
} from '@/modules/lms/_shared/worker-brief.mapper';

type Row = typeof teachers.$inferSelect;

export interface SubjectBrief {
  id: number;
  name: string;
}

export interface LearningCenterBrief {
  id: number;
  name: string | null;
  code: string | null;
}

export interface TeacherListItem {
  id: number;
  worker: WorkerBrief | null;
  subjects: SubjectBrief[];
  learning_center: LearningCenterBrief | null;
}

export const TeacherMapper = {
  toListItem(
    r: Row,
    workerMap: Record<
      number,
      {
        id: number;
        last_name: string | null;
        first_name: string | null;
        middle_name: string | null;
        photo: string | null;
      }
    >,
    subjectsByTeacher: Record<number, SubjectBrief[]>,
    lcMap: Record<number, LearningCenterBrief>,
  ): TeacherListItem {
    return {
      id: r.id,
      worker: WorkerBriefMapper.toItem(workerMap[r.worker_id]),
      subjects: subjectsByTeacher[r.id] ?? [],
      learning_center: lcMap[r.learning_center_id] ?? null,
    };
  },

  /** Teacher minimal — {id, worker} (lessons/teacher embedinglarda). */
  toMinItem(
    r: Row,
    workerMap: Record<number, Parameters<typeof WorkerBriefMapper.toItem>[0]>,
  ) {
    return {
      id: r.id,
      worker: WorkerBriefMapper.toItem(workerMap[r.worker_id]),
    };
  },
};
