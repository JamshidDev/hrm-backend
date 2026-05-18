// WorkerUniversity service. 5 JOIN: specialities + universities + cities + regions.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  worker_universities,
  universities,
  specialities,
  cities,
  regions,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import { WorkerUniversityMapper } from '@/modules/hr/worker-universities/worker-university.mapper';
import {
  CreateWorkerUniversityDto,
  QueryWorkerUniversityDto,
  UpdateWorkerUniversityDto,
  WorkerUniversityListResponseDto,
} from '@/modules/hr/worker-universities/dto/worker-university.dto';

@Injectable()
export class WorkerUniversityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly lookup: WorkerUuidLookup,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryWorkerUniversityDto,
  ): Promise<WorkerUniversityListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const workerId = await this.lookup.toId(filters.uuid);
    const lang = this.ctx.lang;

    // Laravel `scopeFilter`: when($worker_id, fn => where('worker_id', $worker_id)).
    // Agar uuid yo'q yoki invalid bo'lsa — filter qo'shilmaydi (barcha rows).
    const where = and(
      workerId != null ? eq(worker_universities.worker_id, workerId) : undefined,
      notDeleted(worker_universities),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_universities.id,
          from_date: worker_universities.from_date,
          to_date: worker_universities.to_date,
          file: worker_universities.file,
          spec_id: specialities.id,
          spec_name: specialities.name,
          spec_name_ru: specialities.name_ru,
          uni_id: universities.id,
          uni_name: universities.name,
          uni_name_ru: universities.name_ru,
          uni_name_en: universities.name_en,
          uni_education: universities.education,
          uni_type: universities.type,
          city_id: cities.id,
          city_name: cities.name,
          city_name_ru: cities.name_ru,
          city_name_en: cities.name_en,
          city_lat: cities.lat,
          city_long: cities.long,
          region_id: regions.id,
          region_name: regions.name,
        })
        .from(worker_universities)
        .leftJoin(
          specialities,
          eq(specialities.id, worker_universities.speciality_id),
        )
        .leftJoin(
          universities,
          eq(universities.id, worker_universities.university_id),
        )
        .leftJoin(cities, eq(cities.id, universities.city_id))
        .leftJoin(regions, eq(regions.id, cities.region_id))
        .where(where)
        .orderBy(desc(worker_universities.sort))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_universities).where(where),
    ]);

    const data = await Promise.all(
      rows.map((r) =>
        WorkerUniversityMapper.toItem(r, this.i18n, lang, this.minio),
      ),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  async create(dto: CreateWorkerUniversityDto): Promise<void> {
    await this.db.insert(worker_universities).values({
      worker_id: dto.worker_id,
      university_id: dto.university_id,
      speciality_id: dto.speciality_id,
      from_date: dto.from_date ?? null,
      to_date: dto.to_date ?? null,
      file: dto.file ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerUniversityDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_universities)
      .set({
        worker_id: dto.worker_id,
        university_id: dto.university_id,
        speciality_id: dto.speciality_id,
        from_date: dto.from_date ?? null,
        to_date: dto.to_date ?? null,
        file: dto.file ?? null,
      })
      .where(eq(worker_universities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_universities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_universities.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_universities.id })
      .from(worker_universities)
      .where(and(eq(worker_universities.id, id), notDeleted(worker_universities)))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }
}
