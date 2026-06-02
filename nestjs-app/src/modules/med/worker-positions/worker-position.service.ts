// Med worker positions service. Laravel: Med/WorkerController::index.
// Tibbiy ko'rikka yuborish mumkin bo'lgan ACTIVE worker_position'lar —
// organizations CSV + remainingFilter + search, WorkerPositionResource shape.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  worker_positions,
  workers,
  organizations,
  departments,
  positions as positionsTable,
  contracts,
} from '@/db/schema';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { CONTRACT_TYPE_MIN_KEYS } from '@/modules/hr/workers/worker.mapper';
import { pageOf } from '@/modules/med/_shared/helpers';
import type { QueryMedWorkerPositionDto } from '@/modules/med/worker-positions/dto/worker-position.dto';

// Modules\HR\Enums\PositionStatusEnum::ACTIVE.
const POSITION_STATUS_ACTIVE = 2;

// Modules\HR\Enums\EducationEnum::get — 1=high, 2=medium-special, 3=medium, else "".
const EDUCATION_LABELS: Record<number, string> = {
  1: 'messages.education.level.one',
  2: 'messages.education.level.two',
  3: 'messages.education.level.three',
};

// CSV → number[] (array_filter(explode(',', ...)) parity — bo'sh stringlar tashlanadi).
function csvIds(v?: string): number[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0);
}

@Injectable()
export class MedWorkerPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/med/worker-positions
  async list(filters: QueryMedWorkerPositionDto) {
    const { page, perPage, offset } = pageOf(filters);
    const lang = this.ctx.lang;

    const where = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      ...this.buildConditions(filters),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          organization_id: worker_positions.organization_id,
          type: worker_positions.type,
          position_date: worker_positions.position_date,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          w_birthday: workers.birthday,
          w_photo: workers.photo,
          w_education: workers.education,
          o_id: organizations.id,
          o_name: organizations.name,
          o_name_ru: organizations.name_ru,
          o_name_en: organizations.name_en,
          o_group: organizations.group,
          dept_name: departments.name,
          pos_name: positionsTable.name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        // Laravel: orderBy organization_id, department_id, department_position_id.
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
        )
        .limit(perPage)
        .offset(offset),
      this.countWith(where, filters),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          last_name: r.w_last,
          first_name: r.w_first,
          middle_name: r.w_middle,
          birthday: r.w_birthday,
          organization: r.o_id
            ? { id: r.o_id, name: this.orgName(r, lang), group: r.o_group }
            : null,
          photo: await this.minio.fileUrl(r.w_photo),
          education: this.educationName(r.w_education, lang),
          position: r.pos_name ?? null,
          department: r.dept_name ?? null,
          position_date: r.position_date,
          contract_type: this.contractTypeName(r.type, lang),
        })),
      ),
    };
  }

  // count — search/worker-filter bo'lsa workers join kerak (whereHas('worker')).
  private countWith(
    where: SQL | undefined,
    filters: QueryMedWorkerPositionDto,
  ) {
    const base = this.db.select({ total: count() }).from(worker_positions);
    const q = this.needsWorkerJoin(filters)
      ? base.leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      : base;
    return q.where(where);
  }

  private needsWorkerJoin(f: QueryMedWorkerPositionDto): boolean {
    return Boolean(
      f.search ||
      f.last_name ||
      f.first_name ||
      f.middle_name ||
      f.birthday ||
      f.sex != null ||
      f.age_start ||
      f.age_end ||
      f.marital_status ||
      f.country_id ||
      f.region_id ||
      f.city_id ||
      f.current_region_id ||
      f.current_city_id ||
      csvIds(f.nationalities).length ||
      csvIds(f.educations).length,
    );
  }

  // Laravel scopeRemainingFilter + scopeSearch + organizations CSV.
  private buildConditions(f: QueryMedWorkerPositionDto): SQL[] {
    const conds: SQL[] = [];

    // organizations CSV (bo'sh bo'lsa filter yo'q — Laravel when(falsy)).
    const orgIds = csvIds(f.organizations);
    if (orgIds.length)
      conds.push(inArray(worker_positions.organization_id, orgIds));

    // worker_position direct columns.
    if (f.contract_id)
      conds.push(eq(worker_positions.contract_id, f.contract_id));
    const deptIds = csvIds(f.departments);
    if (deptIds.length)
      conds.push(inArray(worker_positions.department_id, deptIds));
    const posIds = csvIds(f.positions);
    if (posIds.length)
      conds.push(inArray(worker_positions.position_id, posIds));
    const depPosIds = csvIds(f.department_positions);
    if (depPosIds.length)
      conds.push(inArray(worker_positions.department_position_id, depPosIds));

    // contract_type → whereHas('contract', type=...).
    if (f.contract_type) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM ${contracts} c WHERE c.id = ${worker_positions.contract_id} AND c.type = ${f.contract_type})`,
      );
    }
    // position_type → whereHas('position', category=...).
    if (f.position_type) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM ${positionsTable} p WHERE p.id = ${worker_positions.position_id} AND p.category = ${f.position_type})`,
      );
    }

    // worker filterlari (whereHas('worker', ...)) — joined workers ustunlari orqali.
    const w = workers;
    if (f.birthday)
      conds.push(sql`EXTRACT(MONTH FROM ${w.birthday}) = ${f.birthday}`);
    if (f.sex != null) conds.push(eq(w.sex, Number(f.sex) === 1));
    if (f.age_start)
      conds.push(
        sql`${w.birthday} <= CURRENT_DATE - (${f.age_start} || ' years')::interval`,
      );
    if (f.age_end)
      conds.push(
        sql`${w.birthday} >= CURRENT_DATE - (${f.age_end} || ' years')::interval`,
      );
    if (f.marital_status) conds.push(eq(w.marital_status, f.marital_status));
    if (f.country_id) conds.push(eq(w.country_id, f.country_id));
    if (f.region_id) conds.push(eq(w.region_id, f.region_id));
    if (f.city_id) conds.push(eq(w.city_id, f.city_id));
    if (f.current_region_id)
      conds.push(eq(w.current_region_id, f.current_region_id));
    if (f.current_city_id) conds.push(eq(w.current_city_id, f.current_city_id));
    const natIds = csvIds(f.nationalities);
    if (natIds.length) conds.push(inArray(w.nationality_id, natIds));
    const eduIds = csvIds(f.educations);
    if (eduIds.length) conds.push(inArray(w.education, eduIds));

    // search — full name + last/first/middle like.
    const searchCond = f.search ? buildWorkerSearchCond(f.search) : undefined;
    if (searchCond) conds.push(searchCond);
    if (f.last_name)
      conds.push(sql`${w.last_name} ILIKE ${'%' + f.last_name + '%'}`);
    if (f.first_name)
      conds.push(sql`${w.first_name} ILIKE ${'%' + f.first_name + '%'}`);
    if (f.middle_name)
      conds.push(sql`${w.middle_name} ILIKE ${'%' + f.middle_name + '%'}`);

    return conds;
  }

  // Laravel OrganizationListResource — ru→name_ru, en→name_en, default→name.
  private orgName(
    o: {
      o_name: string | null;
      o_name_ru: string | null;
      o_name_en: string | null;
    },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.o_name_ru;
    if (lang === 'en') return o.o_name_en;
    return o.o_name;
  }

  // EducationEnum::get — topilmasa "" (parity).
  private educationName(id: number | null, lang: string): string {
    const key = id != null ? EDUCATION_LABELS[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // ContractTypeEnum::tryFrom(type)?->labelMinimized() — topilmasa null.
  private contractTypeName(type: number | null, lang: string): string | null {
    const key = type != null ? CONTRACT_TYPE_MIN_KEYS[type] : undefined;
    if (!key) return null;
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : null;
  }
}
