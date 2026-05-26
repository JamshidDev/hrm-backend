// EduPlanExam mappers. Laravel: ExamResource (LMS module) + EduPlanExam mini.
//
// ExamResource shape (Laravel `LMS\Transformers\ExamResource`):
//   { id, name, whom: {id, name}, topic: {id, name, type: {id, name}},
//     deadline, variant, minute, tests_count, chances, active, description }

const EXAM_WHOM_NAMES: Record<number, string> = {
  1: 'Barchaga',
  2: 'Tegishli lavozimlarga',
  3: 'Belgilangan xodimlarga (Ishlab turgan)',
  4: 'Malaka oshirish imtihonlari uchun',
  5: 'Belgilangan xodimlarga (Ishlamayotgan)',
};

const TOPIC_TYPE_NAMES: Record<number, string> = {
  1: 'Attestatsiya (Sanoat xavfsizligi)',
  2: 'Attestatsiya (Lavozimga loyiqligi)',
  3: 'Malaka sinovi (Razryadni oshirish uchun)',
  4: 'Bilim sinovi (Mehnat muhofazasi)',
};

export interface ExamItem {
  id: number;
  name: string | null;
  whom: { id: number; name: string };
  topic: {
    id: number;
    name: string | null;
    type: { id: number; name: string };
  } | null;
  deadline: string | null;
  variant: number;
  minute: number;
  tests_count: number;
  chances: number;
  active: boolean;
  description: string | null;
}

export interface TopicBrief {
  id: number;
  name: string | null;
  type: number;
}

export interface ExamRow {
  id: number;
  name: string | null;
  whom: number;
  topic_id: number | null;
  deadline: string | null;
  variant: number;
  minute: number;
  tests_count: number;
  chances: number;
  active: boolean;
  description: string | null;
}

export const ExamMapper = {
  toItem(r: ExamRow, topicMap: Record<number, TopicBrief>): ExamItem {
    const t = r.topic_id ? topicMap[Number(r.topic_id)] : null;
    return {
      id: r.id,
      name: r.name,
      whom: {
        id: r.whom,
        name: EXAM_WHOM_NAMES[r.whom] ?? '',
      },
      topic: t
        ? {
            id: t.id,
            name: t.name,
            type: {
              id: t.type,
              name: TOPIC_TYPE_NAMES[t.type] ?? '',
            },
          }
        : null,
      deadline: r.deadline,
      variant: r.variant,
      minute: r.minute,
      tests_count: r.tests_count,
      chances: r.chances,
      active: r.active,
      description: r.description,
    };
  },
};
