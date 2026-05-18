// Application service. Laravel: Vacancy/VacancySendController.
// Vacancy nomzodi tomonidan ariza yuborish, ro'yxat, dashboard, fayllar.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  vacancy_application_files,
  vacancy_application_statuses,
  vacancy_applications,
  vacancy_positions,
} from '@/db/schema';
import type {
  QueryApplicationDto,
  SendApplicationDto,
  UploadFilesDto,
} from '@/modules/vacancy/applications/dto/application.dto';

// Laravel: VacancySendStatusEnum — ariza holatlari.
const SEND_STATUSES: Array<{ id: number; name: string }> = [
  { id: 1, name: 'Yangi' },
  { id: 2, name: 'Jarayonda' },
  { id: 3, name: 'Qabul qilindi' },
  { id: 4, name: 'Rad etildi' },
];

@Injectable()
export class ApplicationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  // POST /v1/vacancies/send-application — yangi ariza yuborish.
  // Laravel: profil to'liqligini, vakansiya muddatini, takror arizani tekshiradi.
  async send(userId: number, dto: SendApplicationDto) {
    // Vakansiya mavjud va muddati o'tmaganligini tekshirish.
    const [position] = await this.db
      .select()
      .from(vacancy_positions)
      .where(eq(vacancy_positions.id, dto.vacancy_position_id))
      .limit(1);
    if (!position) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Takroriy ariza tekshiruvi.
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.vacancy_position_id, dto.vacancy_position_id),
          eq(vacancy_applications.vacancy_user_id, userId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BusinessException(409, this.i18n.t('messages.already_exists'));
    }

    // Ariza + boshlang'ich status yozuvini bitta transaction'da yaratamiz.
    await this.db.transaction(async (tx) => {
      const [app] = await tx
        .insert(vacancy_applications)
        .values({
          vacancy_position_id: dto.vacancy_position_id,
          vacancy_user_id: userId,
        })
        .returning({ id: vacancy_applications.id, created_at: vacancy_applications.created_at });

      await tx.insert(vacancy_application_statuses).values({
        vacancy_application_id: app.id,
        type: 1,
        status: 2,
        details: {
          application_id: app.id,
          number: String(app.id).padStart(8, '0'),
          created: app.created_at,
        },
      });
    });
  }

  // GET /v1/vacancies/applications — joriy foydalanuvchining arizalari.
  async applications(userId: number, q: QueryApplicationDto) {
    const conds = [
      eq(vacancy_applications.vacancy_user_id, userId),
      notDeleted(vacancy_applications),
    ];
    if (q.status !== undefined) {
      conds.push(eq(vacancy_applications.status, q.status));
    }
    return this.db
      .select()
      .from(vacancy_applications)
      .where(and(...conds))
      .orderBy(desc(vacancy_applications.id));
  }

  // GET /v1/vacancies/applications/:id — bitta ariza. Topilmasa 404.
  async show(userId: number, applicationId: number) {
    const [row] = await this.db
      .select()
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          eq(vacancy_applications.vacancy_user_id, userId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Ariza fayllari + status tarixini ham yuklaymiz.
    const [files, statuses] = await Promise.all([
      this.db
        .select()
        .from(vacancy_application_files)
        .where(
          and(
            eq(vacancy_application_files.vacancy_application_id, applicationId),
            notDeleted(vacancy_application_files),
          ),
        ),
      this.db
        .select()
        .from(vacancy_application_statuses)
        .where(eq(vacancy_application_statuses.vacancy_application_id, applicationId)),
    ]);
    return { ...row, files, statuses };
  }

  // GET /v1/vacancies/dashboard — status bo'yicha hisob + "Barchasi".
  async dashboard(userId: number) {
    const rows = await this.db
      .select({
        status: vacancy_applications.status,
        cnt: count(),
      })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.vacancy_user_id, userId),
          notDeleted(vacancy_applications),
        ),
      )
      .groupBy(vacancy_applications.status);

    const countByStatus = new Map<number, number>(
      rows.map((r) => [r.status, Number(r.cnt)] as const),
    );

    const result = SEND_STATUSES.map((s) => ({
      name: s.name,
      count: countByStatus.get(s.id) ?? 0,
    }));
    // Laravel: oxirida "Barchasi" (count=0) qatori qo'shiladi.
    result.push({ name: 'Barchasi', count: 0 });
    return result;
  }

  // POST /v1/vacancies/applications/:id/files — arizaga qo'shimcha fayl yuklash.
  async uploadFiles(applicationId: number, dto: UploadFilesDto) {
    const [exists] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!exists) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (dto.uploads?.length) {
      await this.db.insert(vacancy_application_files).values(
        dto.uploads.map((u) => ({
          vacancy_application_id: applicationId,
          file_type: u.type ?? 1,
          file: u.file ?? null,
          file_name: u.file_name ?? null,
        })),
      );
    }
  }

  // DELETE /v1/vacancies/applications/:id/files/:fileId — faylni o'chirish.
  async deleteFile(fileId: number) {
    const [row] = await this.db
      .select({ id: vacancy_application_files.id })
      .from(vacancy_application_files)
      .where(eq(vacancy_application_files.id, fileId))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacancy_application_files)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_application_files.id, fileId));
  }
}
