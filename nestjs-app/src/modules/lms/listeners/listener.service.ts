// Listeners service. Laravel: ListenerController + ListenerLessonController.
// Tinglovchi (listener) — edu_plan'ga biriktirilgan worker (perspektivasi).
// Real implementation `ctx.user.id` orqali workerni topadi.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';

interface ListenerListQuery {
  page?: number;
  per_page?: number;
}

@Injectable()
export class LmsListenerService {
  constructor(@InjectDb() private readonly _db: DataSource) {}

  /**
   * GET /lms/listener — joriy tinglovchining edu_plan'lari (stub).
   * Laravel: edu_plan_workers + edu_plans joini, user.id orqali.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async index(q: ListenerListQuery) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    return { current_page: page, per_page: perPage, total: 0, data: [] };
  }

  /**
   * GET /lms/listener/lessons — joriy tinglovchining darslari (stub).
   * Laravel: lesson_participants + lessons joini, user.id orqali.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async lessons(q: ListenerListQuery) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    return { current_page: page, per_page: perPage, total: 0, data: [] };
  }

  /**
   * GET /lms/listener/lessons/:lessonId — tinglovchi darsga kirgani (stub).
   * Laravel: ListenerLessonController->start — joined_at saqlanadi.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async startLesson(_lessonId: number) {
    return { success: true, stub: true };
  }
}
