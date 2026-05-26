// LMS main service. Laravel: LMSController (enums, learning-centers, list/*).
// Frontend dropdownlar uchun brief endpointlar.

import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import {
  directions,
  edu_plans,
  groups,
  learning_center_users,
  learning_centers,
  specializations,
} from '@/db/schema';

@Injectable()
export class LmsMainService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * GET /lms/enums — Laravel parity:
   *   edu_plan_types (EduPlanTypeEnum)
   *   exam_types (ExamTypeEnum)
   *   serials (SerialTypeEnum)
   *   lesson_exam_types (faqat id=3 → THREE — Laravel'da shu xil)
   */
  enums() {
    return {
      edu_plan_types: [
        { id: 1, name: 'Malaka oshirish' },
        { id: 2, name: 'Qayta tayyorlash' },
      ],
      exam_types: [
        { id: 1, name: 'Kirish imtihoni' },
        { id: 2, name: 'Chiqish imtihoni' },
        { id: 3, name: 'Navbatdan tashqari' },
      ],
      serials: [
        { id: 1, name: 'MO-RW' },
        { id: 2, name: 'MO-LM' },
        { id: 3, name: 'MO-SM' },
      ],
      lesson_exam_types: [{ id: 3, name: 'THREE' }],
    };
  }

  /**
   * GET /lms/learning-centers — Laravel: LMSController::learningCenters.
   *
   *   LearningCenterUser::where('user_id', auth()->id())
   *     ->with('learning_center')->get()
   *     ->map(fn $u => ['id' => $u->learning_center->id, 'name' => $u->learning_center->name])
   *
   * Returns FLAT array `[{id, name}, ...]` — pagination YO'Q (frontend uchun dropdown).
   * Faqat joriy user biriktirilgan markazlar qaytariladi.
   */
  async learningCenters(): Promise<Array<{ id: number; name: string }>> {
    const userId = this.ctx.user?.id;
    if (!userId) return [];

    // Pivot orqali ulanish IDlari (soft-delete YO'Q rows).
    const links = await this.db
      .select({
        learning_center_id: learning_center_users.learning_center_id,
      })
      .from(learning_center_users)
      .where(
        and(
          eq(learning_center_users.user_id, userId),
          notDeleted(learning_center_users),
        ),
      );
    const lcIds = [...new Set(links.map((l) => Number(l.learning_center_id)))];
    if (!lcIds.length) return [];

    const rows = await this.db
      .select({
        id: learning_centers.id,
        name: learning_centers.name,
      })
      .from(learning_centers)
      .where(
        and(
          inArray(learning_centers.id, lcIds),
          notDeleted(learning_centers),
        ),
      );
    return rows.map((r) => ({ id: Number(r.id), name: r.name }));
  }

  /** GET /lms/list/directions — yo'nalishlar (id, name). */
  async listDirections() {
    return this.db
      .select({ id: directions.id, name: directions.name })
      .from(directions)
      .where(notDeleted(directions));
  }

  /** GET /lms/list/specializations — mutaxassisliklar (id, name). */
  async listSpecializations() {
    return this.db
      .select({ id: specializations.id, name: specializations.name })
      .from(specializations)
      .where(notDeleted(specializations));
  }

  /** GET /lms/list/edu-plans — o'quv rejalar (id, name). */
  async listEduPlans() {
    return this.db
      .select({ id: edu_plans.id, name: edu_plans.name })
      .from(edu_plans)
      .where(notDeleted(edu_plans));
  }

  /** GET /lms/list/groups — guruhlar (id, name?). */
  async listGroups() {
    return this.db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(notDeleted(groups));
  }
}
