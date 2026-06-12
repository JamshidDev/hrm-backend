// Integration mobile-face service. Laravel: MobileFaceController/MobileFaceService.
// HMAC auth orqali himoyalangan (NestJS'da Public).

import { Injectable } from '@nestjs/common';
import { aliasedTable, and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  organizations,
  positions,
  worker_phones,
  worker_photos,
  worker_positions,
  workers,
} from '@/db/schema';
import type {
  MobileFaceCheckWorkerDto,
  MobileFaceSchedulesDto,
} from '@/modules/integration/mobile-face/dto/mobile-face.dto';

const POSITION_STATUS_ACTIVE = 2;

@Injectable()
export class IntegrationMobileFaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  /** POST /integration/mobile-face/send-event — stub (#16, yozuv — alohida). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async sendEvent(_body: unknown) {
    return { success: true, stub: true };
  }

  /**
   * POST /integration/mobile-face/check-worker — Laravel MobileFaceService::checkWorker.
   * Worker (pin) + active positions (org/parent/dept/position) + photos + phones.
   * Worker yo'q yoki active position yo'q → Helper::response() (data []).
   */
  async checkWorker(dto: MobileFaceCheckWorkerDto) {
    const lang = this.ctx.lang;
    const [worker] = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        pin: workers.pin,
        sex: workers.sex,
      })
      .from(workers)
      .where(and(eq(workers.pin, Number(dto.pin)), notDeleted(workers)))
      .limit(1);
    if (!worker) return [];

    const parentOrg = aliasedTable(organizations, 'parent_org');
    const posRows = await this.db
      .select({
        id: worker_positions.id,
        org_id: organizations.id,
        org_name: organizations.name,
        parent_id: parentOrg.id,
        parent_name: parentOrg.name,
        parent_name_ru: parentOrg.name_ru,
        parent_name_en: parentOrg.name_en,
        parent_group: parentOrg.group,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_id: positions.id,
        pos_name: positions.name,
        pos_name_ru: positions.name_ru,
        pos_name_en: positions.name_en,
      })
      .from(worker_positions)
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .leftJoin(parentOrg, eq(parentOrg.id, organizations.parent_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(positions, eq(positions.id, worker_positions.position_id))
      .where(
        and(
          eq(worker_positions.worker_id, worker.id),
          eq(worker_positions.status, POSITION_STATUS_ACTIVE),
          notDeleted(worker_positions),
        ),
      );
    // Laravel: !$worker->position (active) → bo'sh.
    if (posRows.length === 0) return [];

    const [photoRows, phoneRows] = await Promise.all([
      this.db
        .select({ photo: worker_photos.photo, current: worker_photos.current })
        .from(worker_photos)
        .where(eq(worker_photos.worker_id, worker.id)),
      this.db
        .select({ phone: worker_phones.phone })
        .from(worker_phones)
        .where(eq(worker_phones.worker_id, worker.id)),
    ]);

    const photos = await Promise.all(
      photoRows.map(async (p) => ({
        photo: await this.minio.fileUrl(p.photo),
        current: p.current,
      })),
    );

    return {
      id: worker.id,
      last_name: worker.last_name,
      first_name: worker.first_name,
      middle_name: worker.middle_name,
      birthday: worker.birthday,
      pin: worker.pin,
      sex: worker.sex ? 'male' : 'female',
      photos,
      phones: phoneRows.map((p) => p.phone),
      positions: posRows.map((r) => ({
        id: r.id,
        organization: r.org_id
          ? {
              id: r.org_id,
              name: r.org_name,
              parent: r.parent_id
                ? {
                    id: r.parent_id,
                    name: this.orgName(
                      r.parent_name,
                      r.parent_name_ru,
                      r.parent_name_en,
                      lang,
                    ),
                    group: r.parent_group ?? false,
                  }
                : null,
            }
          : null,
        department: r.dept_id
          ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
          : null,
        position: r.pos_id
          ? {
              id: r.pos_id,
              name: this.posName(
                r.pos_name,
                r.pos_name_ru,
                r.pos_name_en,
                lang,
              ),
            }
          : null,
      })),
    };
  }

  /**
   * POST /integration/mobile-face/schedules — Laravel MobileFaceService::schedules.
   * TurnstileWorkerSchedule (worker_id, active worker_position) oy oralig'ida.
   */
  async schedules(dto: MobileFaceSchedulesDto) {
    const [worker] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.pin, Number(dto.pin)), notDeleted(workers)))
      .limit(1);
    const workerId = worker?.id ?? null;

    const mm = String(dto.month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(dto.year, dto.month, 0)).getUTCDate();
    const start = `${dto.year}-${mm}-01`;
    const end = `${dto.year}-${mm}-${String(lastDay).padStart(2, '0')}`;

    // turnstile_worker_schedules — partitsiyalangan parent → raw SQL.
    const res = await this.db.execute(sql`
      SELECT tws.date::text AS date, tws.start_time, tws.end_time, tws.work_status
      FROM turnstile_worker_schedules tws
      WHERE tws.worker_id = ${workerId}
        AND EXISTS (
          SELECT 1 FROM worker_positions wp
          WHERE wp.id = tws.worker_position_id
            AND wp.status = ${POSITION_STATUS_ACTIVE}
        )
        AND tws.date BETWEEN ${start} AND ${end}
      ORDER BY tws.date
    `);
    return rowsOf(res).map((s) => ({
      date: s.date as string,
      start_time: s.start_time as string | null,
      end_time: s.end_time as string | null,
      is_work: s.work_status as boolean | number | null,
    }));
  }

  // OrganizationListResource lang nomi (fallback YO'Q).
  private orgName(
    name: string | null,
    ru: string | null,
    en: string | null,
    lang: string,
  ): string | null {
    return lang === 'ru' ? ru : lang === 'en' ? en : name;
  }

  // PositionMinimalResource lang nomi.
  private posName(
    name: string | null,
    ru: string | null,
    en: string | null,
    lang: string,
  ): string | null {
    return lang === 'ru' ? ru : lang === 'en' ? en : name;
  }
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
