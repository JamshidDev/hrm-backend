// Lesson mapper. Laravel: LessonController::index → calendar-style guruh
// (groupBy('lesson_date')). Har bir dars TeacherResource + EduPlanExamMinResource
// bilan birga chiqadi.

// Laravel: WorkerMinimalResource — {id, photo(fileUrl), last_name, first_name, middle_name}
export interface LessonWorker {
  id: number | null;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
}

// Laravel: TeacherResource — {id, worker: WorkerMinimalResource}
export interface LessonTeacher {
  id: number | null;
  worker: LessonWorker;
}

// Laravel: EduPlanExamMinResource — {id, exam: {id, name}}
export interface LessonExam {
  id: number;
  exam: { id: number | null; name: string | null };
}

// Laravel index har bir dars uchun map qiladigan shape.
export interface CalendarLessonItem {
  id: number;
  name: string | null;
  group: number | null; // group?.code (integer column)
  subject: string | null; // subject?.name
  teacher: LessonTeacher;
  start_time: string;
  end_time: string;
  exam: LessonExam | null;
}

export interface CalendarDay {
  lesson_date: string;
  lessons: CalendarLessonItem[];
}

// Laravel `new TeacherResource(null)` → $this->id va $this->worker null bo'lib,
// WorkerMinimalResource(null) ham barcha maydonlarni null qaytaradi
// (photo esa fileUrl(null) = null). Soft-deleted teacher uchun shu shaklni beramiz.
export function nullTeacher(): LessonTeacher {
  return {
    id: null,
    worker: {
      id: null,
      photo: null,
      last_name: null,
      first_name: null,
      middle_name: null,
    },
  };
}
