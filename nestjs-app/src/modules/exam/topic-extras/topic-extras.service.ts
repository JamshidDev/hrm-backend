// Topic extras service. Laravel: Exam/ExamController (positions, workers).
// Topic uchun lavozimlar va xodimlar ro'yxati.
//
// Laravel `Topic::findOrFail($topicId)` ishlatadi — topic topilmasa 404.
// Topic uchun org-scope `topic->organizations()` (pivot) orqali olinadi.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, exists, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  organizations,
  positions as positionsTable,
  topic_organizations,
  topics,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';

// Laravel ContractTypeEnum::labelMinimized — type → i18n key.
const CONTRACT_TYPE_MIN_KEYS: Record<number, string> = {
  1: 'messages.contract.minimeze_employment_contract_indefinite',
  2: 'messages.contract.minimeze_civil_labor_contract',
  3: 'messages.contract.minimeze_employment_contract_part_time',
  4: 'messages.contract.minimeze_employment_contract_remote',
  5: 'messages.contract.minimeze_employment_contract_seasonal',
  6: 'messages.contract.minimeze_employment_contract_fixed',
};

@Injectable()
export class TopicExtrasService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // Topic mavjudligini tekshirish. Laravel findOrFail bilan ekvivalent.
  private async ensureTopic(topicId: number) {
    const [row] = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, topicId), notDeleted(topics)))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // Laravel: Topic::findOrFail → ->organizations()->pluck('organizations.id').
  private async organizationIdsForTopic(topicId: number): Promise<number[]> {
    const rows = await this.db
      .select({ org_id: topic_organizations.organization_id })
      .from(topic_organizations)
      .where(eq(topic_organizations.topic_id, topicId));
    return [...new Set(rows.map((r) => r.org_id).filter((id): id is number => id != null))];
  }

  // Laravel: WorkerPosition::whereIn('organization_id', $orgIds)->distinct()->select('position_id')
  //          → Position::whereIn('id', $positionIds)->get() → PositionMinimalResource collection.
  // Resource shape: {id, name (lang-aware)}.
  async positions(topicId: number, _q: { page?: number; per_page?: number }) {
    await this.ensureTopic(topicId);
    const lang = this.ctx.lang;

    const orgIds = await this.organizationIdsForTopic(topicId);
    if (orgIds.length === 0) return [];

    // worker_positions → distinct position_id'lar.
    const wpRows = await this.db
      .selectDistinct({ position_id: worker_positions.position_id })
      .from(worker_positions)
      .where(
        and(
          inArray(worker_positions.organization_id, orgIds),
          isNull(worker_positions.deleted_at),
        ),
      );
    const positionIds = wpRows
      .map((r) => r.position_id)
      .filter((id): id is number => id != null);
    if (positionIds.length === 0) return [];

    // Laravel: Position::whereIn('id', $positionIds)->get() — soft-delete filter.
    const rows = await this.db
      .select({
        id: positionsTable.id,
        name: positionsTable.name,
        name_ru: positionsTable.name_ru,
        name_en: positionsTable.name_en,
      })
      .from(positionsTable)
      .where(
        and(
          inArray(positionsTable.id, positionIds),
          isNull(positionsTable.deleted_at),
        ),
      );

    // Laravel PositionMinimalResource: name lang-aware.
    return rows.map((r) => ({
      id: r.id,
      name:
        lang === 'ru'
          ? (r.name_ru ?? r.name)
          : lang === 'en'
            ? (r.name_en ?? r.name)
            : r.name,
    }));
  }

  // Topic bilan bog'liq xodimlar. Laravel ExamService::workers —
  //   WorkerPosition::whereIn('organization_id', $orgIds)
  //     ->status=ACTIVE
  //     ->with(['department:id,name,level', 'organization:id,name,name_en,name_ru,group',
  //             'position:id,name', 'worker:id,uuid,last_name,first_name,middle_name,birthday,photo'])
  //     ->orderBy(organization_id, department_id, department_position_id)
  //     ->paginate($perPage);
  // Resource shape: WorkerPositionResource.
  async workers(
    topicId: number,
    q: { page?: number; per_page?: number; search?: string },
  ) {
    await this.ensureTopic(topicId);
    const lang = this.ctx.lang;

    const orgIds = await this.organizationIdsForTopic(topicId);
    if (orgIds.length === 0) {
      return {
        current_page: q.page ?? 1,
        total: 0,
        data: [] as Array<unknown>,
      };
    }

    const perPage = Number(q.per_page ?? 50);
    const page = Number(q.page ?? 1);
    const offset = (page - 1) * perPage;

    // Laravel WorkerPosition::scopeSearch — request('search') bo'lsa
    // whereHas('worker', searchByFullName). NestJS'da `buildWorkerSearchCond`
    // bilan worker'da EXISTS qiladi.
    const searchCond = buildWorkerSearchCond(q.search);
    const workerSearchExists = searchCond
      ? exists(
          this.db
            .select({ x: sql`1` })
            .from(workers)
            .where(and(eq(workers.id, worker_positions.worker_id), searchCond)),
        )
      : undefined;

    const where = and(
      inArray(worker_positions.organization_id, orgIds),
      isNull(worker_positions.deleted_at),
      eq(worker_positions.status, 2), // PositionStatusEnum::ACTIVE
      workerSearchExists,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          uuid: worker_positions.uuid,
          position_date: worker_positions.position_date,
          rate: worker_positions.rate,
          rank: worker_positions.rank,
          type: worker_positions.type,
          salary: worker_positions.salary,
          group: worker_positions.group,
          // worker eager-load
          w_id: workers.id,
          w_uuid: workers.uuid,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          w_birthday: workers.birthday,
          w_photo: workers.photo,
          w_pin: workers.pin,
          // organization
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          // department
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          // position
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          and(
            eq(departments.id, worker_positions.department_id),
            isNull(departments.deleted_at),
          ),
        )
        .leftJoin(
          positionsTable,
          and(
            eq(positionsTable.id, worker_positions.position_id),
            isNull(positionsTable.deleted_at),
          ),
        )
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
        )
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .where(where),
    ]);

    const orgName = (o: {
      org_name: string | null;
      org_name_ru: string | null;
      org_name_en: string | null;
    }) =>
      lang === 'ru'
        ? (o.org_name_ru ?? o.org_name)
        : lang === 'en'
          ? (o.org_name_en ?? o.org_name)
          : o.org_name;

    // Laravel WorkerPositionResource shape.
    const data = await Promise.all(
      rows.map(async (r) => {
        const typeKey = CONTRACT_TYPE_MIN_KEYS[r.type];
        const typeLabel = typeKey ? this.i18n.t(typeKey, { lang }) : '';
        return {
          id: r.id,
          uuid: r.uuid,
          // WorkerInfoResource: {id, uuid, photo, last_name, first_name,
          //   middle_name, birthday, pin}.
          // Laravel ExamService::workers `with('worker:id,uuid,last_name,
          //   first_name,middle_name,birthday,photo')` — `pin` eager-load YO'Q
          //   → Resource'da `$this->pin` = null.
          worker: r.w_id
            ? {
                id: r.w_id,
                uuid: r.w_uuid,
                photo: await this.minio.fileUrl(r.w_photo),
                last_name: r.w_last,
                first_name: r.w_first,
                middle_name: r.w_middle,
                birthday: r.w_birthday,
                pin: null as number | null,
              }
            : null,
          // OrganizationListResource: {id, name, group}.
          organization: r.org_id
            ? {
                id: r.org_id,
                name: orgName(r),
                group: r.org_group ?? false,
              }
            : null,
          // DepartmentListResource: {id, name, level}.
          department: r.dept_id
            ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
            : null,
          // PositionMinimalResource: {id, name}.
          position: r.pos_id ? { id: r.pos_id, name: r.pos_name } : null,
          type: {
            id: r.type,
            name: typeof typeLabel === 'string' ? typeLabel : '',
          },
          position_date: r.position_date,
          group: r.group,
          rank: r.rank,
          // Laravel WorkerPosition.rate accessor: $value / 100.
          rate: r.rate != null ? r.rate / 100 : null,
          salary: r.salary,
        };
      }),
    );

    return { current_page: page, total: Number(total), data };
  }
}
