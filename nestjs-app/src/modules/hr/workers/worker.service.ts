// Worker service. Laravel: WorkerController + WorkerService.
//
// Read endpoint:
//   - checkByPin(pin) — exactly matches worker by PIN + with positions.
//
// Mutations (parity stub — full implementation Bosqich 3'da):
//   - create(dto, photos?) — worker + phones + user account.
//   - update(id, dto) — selective fields.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  workers,
  worker_positions,
  organizations,
  departments,
  positions as positionsTable,
  worker_phones,
  worker_photos,
  users as usersTable,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  WorkerMapper,
  CONTRACT_TYPE_FULL_KEYS,
} from '@/modules/hr/workers/worker.mapper';
import {
  CreateWorkerDto,
  UpdateWorkerDto,
  WorkerInfoDto,
  WorkerPhotoUploadDto,
  WorkerWithPositionDto,
} from '@/modules/hr/workers/dto/worker.dto';
import * as bcrypt from 'bcrypt';

// WorkerMinimalResource — Laravel shape: {id, photo, last_name, first_name, middle_name}.
interface WorkerMinShape {
  id: number;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
}

@Injectable()
export class WorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /check-worker?pin=...
  async checkByPin(pin: string): Promise<WorkerWithPositionDto | null> {
    const pinNum = Number(pin);
    if (Number.isNaN(pinNum)) return null;

    // Laravel: whereLike('pin', $request->pin). PIN bigint — exact match yetarli.
    const [worker] = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        photo: workers.photo,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        pin: workers.pin,
      })
      .from(workers)
      .where(and(eq(workers.pin, pinNum), notDeleted(workers)))
      .limit(1);

    if (!worker) return null;

    const positions = await this.fetchWorkerPositions(worker.id);
    const lang = this.ctx.lang;
    // Laravel: `hrs` faqat X-AUTH-TYPE=sanctum'da to'ldiriladi. NestJS auth.hybrid
    // hozircha faqat sanctum'ni qabul qiladi, shuning uchun har doim to'ldiramiz.
    const positionDtos = await Promise.all(
      positions.map(async (p) => {
        const key = CONTRACT_TYPE_FULL_KEYS[p.type];
        const label = key ? this.i18n.t(key, { lang }) : '';
        const hrs = await this.fetchHrUsers(p.organization_id);
        return {
          ...WorkerMapper.toPositionMin(
            p,
            typeof label === 'string' ? label : '',
          ),
          hrs,
        };
      }),
    );

    return WorkerMapper.toWithPosition(worker, positionDtos, (path) =>
      this.minio.fileUrl(path),
    );
  }

  // POST /workers — store.
  async create(dto: CreateWorkerDto): Promise<WorkerInfoDto> {
    const pinNum = dto.pin ? Number(dto.pin) : null;

    if (pinNum != null) {
      const [exists] = await this.db
        .select({ id: workers.id })
        .from(workers)
        .where(and(eq(workers.pin, pinNum), notDeleted(workers)))
        .limit(1);
      if (exists) {
        throw new BusinessException(
          422,
          this.i18n.t('messages.user_all_ready'),
        );
      }
    }

    // Insert worker.
    const [worker] = await this.db
      .insert(workers)
      .values({
        uuid: sql`uuid_generate_v4()`,
        country_id: dto.country_id,
        region_id: dto.region_id,
        city_id: dto.city_id,
        current_region_id: dto.current_region_id,
        current_city_id: dto.current_city_id,
        nationality_id: dto.nationality_id,
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        birthday: dto.birthday,
        sex: Boolean(dto.sex),
        marital_status: dto.marital_status,
        pin: pinNum,
        address: dto.address ?? null,
        work_experience: dto.work_experience
          ? Math.trunc(Number(dto.work_experience))
          : 0,
        experience_date: dto.experience_date ?? null,
        education: dto.education ?? 1,
        // birth_day va birth_month avtomatik trigger orqali Laravel'da, tartibga solamiz.
        birth_day: new Date(dto.birthday).getUTCDate(),
        birth_month: new Date(dto.birthday).getUTCMonth() + 1,
      })
      .returning();

    // Sync phones.
    if (dto.phones && dto.phones.length > 0) {
      const validPhones = dto.phones.filter((p) => p.length === 9);
      if (validPhones.length > 0) {
        await this.db.insert(worker_phones).values(
          validPhones.map((p) => ({
            worker_id: worker.id,
            phone: Number(p),
          })),
        );
      }
    }

    // Sync photos (base64 → MinIO + worker_photos rows + worker.photo for current).
    let currentPhotoPath: string | null = worker.photo;
    if (dto.photos && dto.photos.length > 0) {
      currentPhotoPath = await this.syncPhotos(worker.id, dto.photos);
    }

    // Create user account.
    if (dto.user_phone) {
      await this.createUserAccount(worker.id, dto.user_phone, pinNum);
    }

    return WorkerMapper.toInfo(
      {
        id: worker.id,
        uuid: worker.uuid,
        photo: currentPhotoPath,
        last_name: worker.last_name,
        first_name: worker.first_name,
        middle_name: worker.middle_name,
        birthday: worker.birthday,
        pin: worker.pin,
      },
      (path) => this.minio.fileUrl(path),
    );
  }

  // PUT /workers/{id} — update.
  async update(id: number, dto: UpdateWorkerDto): Promise<void> {
    const [current] = await this.db
      .select()
      .from(workers)
      .where(and(eq(workers.id, id), notDeleted(workers)))
      .limit(1);

    if (!current) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const pinNum = dto.pin ? Number(dto.pin) : null;

    // Laravel `updatePassword` flag — agar set bo'lsa, faqat password yangilanadi.
    if (dto.update_password) {
      await this.resetUserPassword(id, current.pin ?? pinNum);
      return;
    }

    if (pinNum != null && pinNum !== current.pin) {
      const [exists] = await this.db
        .select({ id: workers.id })
        .from(workers)
        .where(
          and(
            eq(workers.pin, pinNum),
            notDeleted(workers),
            sql`${workers.id} <> ${id}`,
          ),
        )
        .limit(1);
      if (exists) {
        throw new BusinessException(
          422,
          this.i18n.t('messages.user_all_ready'),
        );
      }
    }

    await this.db
      .update(workers)
      .set({
        country_id: dto.country_id,
        region_id: dto.region_id,
        city_id: dto.city_id,
        current_region_id: dto.current_region_id,
        current_city_id: dto.current_city_id,
        nationality_id: dto.nationality_id,
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        birthday: dto.birthday,
        sex: Boolean(dto.sex),
        marital_status: dto.marital_status,
        pin: pinNum,
        address: dto.address ?? null,
        work_experience: dto.work_experience
          ? Math.trunc(Number(dto.work_experience))
          : 0,
        experience_date: dto.experience_date ?? null,
        education: dto.education ?? 1,
        birth_day: new Date(dto.birthday).getUTCDate(),
        birth_month: new Date(dto.birthday).getUTCMonth() + 1,
      })
      .where(eq(workers.id, id));

    // Phones sync — Laravel: forceDelete then re-insert.
    if (dto.phones !== undefined) {
      await this.db
        .delete(worker_phones)
        .where(eq(worker_phones.worker_id, id));
      if (dto.phones && dto.phones.length > 0) {
        const validPhones = dto.phones.filter((p) => p.length === 9);
        if (validPhones.length > 0) {
          await this.db.insert(worker_phones).values(
            validPhones.map((p) => ({
              worker_id: id,
              phone: Number(p),
            })),
          );
        }
      }
    }

    // Sync photos (base64 → MinIO + worker_photos rows; updates worker.photo when
    // a photo with `current: true` is provided).
    if (dto.photos && dto.photos.length > 0) {
      await this.syncPhotos(id, dto.photos);
    }

    if (dto.user_phone) {
      await this.syncUserAccount(id, dto.user_phone, current.pin ?? pinNum);
    }
  }

  // ---- Helpers ----

  // Laravel: WorkerService::syncPhotos — uploadBase64File + worker_photos insert.
  // Returns the final `worker.photo` path (or null if no current set this call).
  private async syncPhotos(
    workerId: number,
    photos: WorkerPhotoUploadDto[],
  ): Promise<string | null> {
    let lastCurrentPath: string | null = null;
    for (const photo of photos) {
      const path = await this.minio.uploadBase64File(
        photo.photo,
        'worker-photos',
        ['jpg', 'jpeg', 'png'],
      );
      if (photo.current) {
        // Unset previous current photos, then assign this as worker.photo.
        await this.db
          .update(worker_photos)
          .set({ current: false })
          .where(eq(worker_photos.worker_id, workerId));
        await this.db
          .update(workers)
          .set({ photo: path })
          .where(eq(workers.id, workerId));
        lastCurrentPath = path;
      }
      await this.db.insert(worker_photos).values({
        worker_id: workerId,
        photo: path,
        current: photo.current,
      });
    }
    return lastCurrentPath;
  }

  private async fetchWorkerPositions(workerId: number) {
    const rows = await this.db
      .select({
        id: worker_positions.id,
        type: worker_positions.type,
        organization_id: worker_positions.organization_id,
        organization_full_name: organizations.full_name,
        position_name: positionsTable.name,
        department_name: departments.name,
        position_date: worker_positions.position_date,
      })
      .from(worker_positions)
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(
        and(
          eq(worker_positions.worker_id, workerId),
          isNull(worker_positions.deleted_at),
        ),
      )
      .orderBy(asc(worker_positions.id));
    return rows;
  }

  // Laravel: `User::query()->where('organization_id', $organization_id)
  //   ->whereHas('roles', fn ($r) => $r->whereIn('name', ['HR','HRLeader']))
  //   ->with(['worker'])->get()->map(...)`.
  private async fetchHrUsers(
    organizationId: number | null,
  ): Promise<Array<{ worker: WorkerMinShape | null; phone: number }> | null> {
    if (organizationId == null) return [];
    // Laravel `whereHas` — subquery + default user ordering. Eloquent eagerLoad'da
    // results actual order — bu DB connection orderiga bog'liq (insertion order).
    // Duplicate users (HR+HRLeader bir vaqtning o'zida) — DISTINCT bilan oldini olamiz.
    const rows = await this.db.execute(sql`
      SELECT DISTINCT ON (u.id)
        u.id AS user_id,
        u.phone AS phone,
        w.id AS worker_id,
        w.photo AS worker_photo,
        w.last_name AS worker_last,
        w.first_name AS worker_first,
        w.middle_name AS worker_middle
      FROM users u
      LEFT JOIN workers w ON w.id = u.worker_id
      WHERE u.organization_id = ${organizationId}
        AND EXISTS (
          SELECT 1 FROM model_has_roles mhr
          INNER JOIN roles r ON r.id = mhr.role_id
          WHERE mhr.model_id = u.id
            AND mhr.model_type = 'App\\Models\\User'
            AND r.name IN ('HR','HRLeader')
        )
      ORDER BY u.id
    `);

    const data = rows as unknown as Array<{
      user_id: number;
      phone: string | number | bigint;
      worker_id: number | null;
      worker_photo: string | null;
      worker_last: string | null;
      worker_first: string | null;
      worker_middle: string | null;
    }>;

    return Promise.all(
      data.map(async (r) => ({
        worker: r.worker_id
          ? {
              id: r.worker_id,
              photo: await this.minio.fileUrl(r.worker_photo),
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
            }
          : null,
        phone: Number(r.phone),
      })),
    );
  }

  private async createUserAccount(
    workerId: number,
    phone: string,
    pin: number | null,
  ): Promise<void> {
    const phoneNum = Number(phone);
    if (Number.isNaN(phoneNum)) return;

    const [exists] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, phoneNum))
      .limit(1);
    if (exists) {
      throw new BusinessException(
        422,
        this.i18n.t('messages.worker_phone_exists'),
      );
    }

    const adminUser = this.ctx.user;
    const orgId = adminUser?.organization_id ?? null;
    const password = pin ? await bcrypt.hash(String(pin), 10) : '';

    await this.db.insert(usersTable).values({
      uuid: sql`uuid_generate_v4()`,
      organization_id: orgId,
      phone: phoneNum,
      password,
      password_changed_at: sql`NOW()`,
      worker_id: workerId,
    });
  }

  private async syncUserAccount(
    workerId: number,
    phone: string,
    pin: number | null,
  ): Promise<void> {
    const phoneNum = Number(phone);
    if (Number.isNaN(phoneNum)) return;

    const [current] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.worker_id, workerId))
      .limit(1);

    if (current) {
      // Boshqa userda shu phone borligini tekshirish.
      const [conflict] = await this.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.phone, phoneNum),
            sql`${usersTable.id} <> ${current.id}`,
          ),
        )
        .limit(1);
      if (conflict) {
        throw new BusinessException(
          422,
          this.i18n.t('messages.worker_phone_exists'),
        );
      }

      await this.db
        .update(usersTable)
        .set({
          phone: phoneNum,
          organization_id: this.ctx.user?.organization_id ?? null,
        })
        .where(eq(usersTable.id, current.id));
    } else {
      await this.createUserAccount(workerId, phone, pin);
    }
  }

  private async resetUserPassword(
    workerId: number,
    pin: number | null,
  ): Promise<void> {
    if (!pin) return;
    const password = await bcrypt.hash(String(pin), 10);
    await this.db
      .update(usersTable)
      .set({ password, password_changed_at: sql`NOW()` })
      .where(eq(usersTable.worker_id, workerId));
  }
}
