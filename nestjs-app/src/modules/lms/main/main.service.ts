// LMS main service. Laravel: LMSController (enums, learning-centers, list/*).
// Frontend dropdownlar uchun brief endpointlar.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { directions, specializations, edu_plans, groups } from '@/db/schema';

@Injectable()
export class LmsMainService {
  constructor(@InjectDb() private readonly db: DataSource) {}

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
   * GET /lms/learning-centers — Laravel: organizationsdagi is_learning_center=true.
   * Stub: bo'sh array.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async learningCenters() {
    return [];
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
