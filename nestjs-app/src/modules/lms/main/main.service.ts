// LMS main service. Laravel: LMSController (enums, learning-centers, list/*).
// Frontend dropdownlar uchun brief endpointlar.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
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
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import type { LmsListQueryDto } from '@/modules/lms/main/dto/list.dto';

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
        and(inArray(learning_centers.id, lcIds), notDeleted(learning_centers)),
      );
    return rows.map((r) => ({ id: Number(r.id), name: r.name }));
  }

  // GET /lms/list/directions — Laravel: LMSController::listDirections →
  //   DirectionController::index. Direction::search()->orderByDesc('id')->paginate()
  //   → DirectionListResource {id, name, name_ru, name_en}.
  async listDirections(q: LmsListQueryDto) {
    const { page, perPage } = readPaging(q);
    const search = q.search?.trim();
    const where = and(
      notDeleted(directions),
      search
        ? or(
            ilike(directions.name, `%${search}%`),
            ilike(directions.name_ru, `%${search}%`),
            ilike(directions.name_en, `%${search}%`),
          )
        : undefined,
    );
    return lmsPaginate({
      db: this.db,
      countTable: directions,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: directions.id,
            name: directions.name,
            name_ru: directions.name_ru,
            name_en: directions.name_en,
          })
          .from(directions)
          .where(where)
          .orderBy(desc(directions.id))
          .limit(limit)
          .offset(offset),
      mapper: (r) => ({
        id: r.id,
        name: r.name,
        name_ru: r.name_ru,
        name_en: r.name_en,
      }),
    });
  }

  // GET /lms/list/specializations — Laravel: Specialization::search()->with('direction')
  //   ->paginate() → SpecializationListResource {id, name, direction:{id,name}, name_ru,
  //   name_en, positions_count}. listSpecializations'da withCount YO'Q → positions_count null.
  async listSpecializations(q: LmsListQueryDto) {
    const { page, perPage } = readPaging(q);
    const search = q.search?.trim();
    const where = and(
      notDeleted(specializations),
      search
        ? or(
            ilike(specializations.name, `%${search}%`),
            ilike(specializations.name_ru, `%${search}%`),
            ilike(specializations.name_en, `%${search}%`),
          )
        : undefined,
    );
    return lmsPaginate({
      db: this.db,
      countTable: specializations,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: specializations.id,
            name: specializations.name,
            name_ru: specializations.name_ru,
            name_en: specializations.name_en,
            direction_id: specializations.direction_id,
          })
          .from(specializations)
          .where(where)
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const dirIds = [
          ...new Set(
            rows
              .map((r) => r.direction_id)
              .filter((x): x is number => x != null),
          ),
        ];
        const dirRows = dirIds.length
          ? await this.db
              .select({ id: directions.id, name: directions.name })
              .from(directions)
              .where(inArray(directions.id, dirIds))
          : [];
        const dirMap = new Map(dirRows.map((d) => [d.id, d]));
        return rows.map((r) => {
          const d = r.direction_id ? dirMap.get(r.direction_id) : undefined;
          return {
            id: r.id,
            name: r.name,
            direction: d ? { id: d.id, name: d.name } : null,
            name_ru: r.name_ru,
            name_en: r.name_en,
            positions_count: null, // listSpecializations'da withCount yo'q
          };
        });
      },
    });
  }

  // GET /lms/list/edu-plans — Laravel: EduPlan::filter($user)->paginate() →
  //   EduPlanMinimalResource {id, name, start_date, hours, count_groups, count_workers}.
  //   filter: learning_center_id IN (user'ning learning_center_users markazlari).
  async listEduPlans(q: LmsListQueryDto) {
    const { page, perPage } = readPaging(q);
    const userId = Number(this.ctx.user?.id ?? 0);
    const lcFilter = sql`${edu_plans.learning_center_id} IN (
      SELECT learning_center_id FROM learning_center_users
      WHERE user_id = ${userId} AND deleted_at IS NULL
    )`;
    const where = and(notDeleted(edu_plans), lcFilter);
    return lmsPaginate({
      db: this.db,
      countTable: edu_plans,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: edu_plans.id,
            name: edu_plans.name,
            start_date: edu_plans.start_date,
            hours: edu_plans.hours,
            count_groups: edu_plans.count_groups,
            count_workers: edu_plans.count_workers,
          })
          .from(edu_plans)
          .where(where)
          .limit(limit)
          .offset(offset),
      mapper: (r) => ({
        id: r.id,
        name: r.name,
        start_date: r.start_date,
        hours: r.hours,
        count_groups: r.count_groups,
        count_workers: r.count_workers,
      }),
    });
  }

  // GET /lms/list/groups — Laravel: Group::with('learning_center')->paginate() →
  //   GroupListResource {id, code: getCode(lc), workers: workers_count}.
  //   withCount YO'Q → workers null.
  async listGroups(q: LmsListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = and(notDeleted(groups));
    return lmsPaginate({
      db: this.db,
      countTable: groups,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: groups.id,
            code: groups.code,
            learning_center_id: groups.learning_center_id,
          })
          .from(groups)
          .where(where)
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const lcIds = [
          ...new Set(
            rows
              .map((r) => r.learning_center_id)
              .filter((x): x is number => x != null),
          ),
        ];
        const lcRows = lcIds.length
          ? await this.db
              .select({ id: learning_centers.id, code: learning_centers.code })
              .from(learning_centers)
              .where(inArray(learning_centers.id, lcIds))
          : [];
        const lcCodeMap = new Map(lcRows.map((l) => [l.id, l.code]));
        return rows.map((r) => {
          const lcCode = r.learning_center_id
            ? (lcCodeMap.get(r.learning_center_id) ?? '')
            : '';
          return {
            id: r.id,
            code: `M${lcCode} ${r.code ?? ''}-guruh`,
            workers: null, // withCount yo'q
          };
        });
      },
    });
  }
}
