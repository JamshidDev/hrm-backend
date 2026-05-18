// VacancyPosition service. Laravel: HR/VacancyPositionController + VacancyApplication*.
//
// QAYDLAR: Vacancy domeni juda katta — bu yerda asosiy CRUD + actions taqdim etiladi.
// Bazi sub-endpointlar (file upload, zoom meeting, exam attach) Laravel'da ham
// integratsiya talab qiladi — bu yerda minimal implementatsiya.

import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  department_positions,
  organizations,
  positions as positionsTable,
  vacancy_application_files,
  vacancy_applications,
  vacancy_positions,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import {
  ChangeStatusDto,
  CreateVacancyPositionDto,
  QueryVacancyPositionDto,
  UpdateApplicationStatusDto,
  UpdateVacancyPositionDto,
} from '@/modules/hr/vacancy-positions/dto/vacancy-position.dto';

@Injectable()
export class VacancyPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  // GET /api/v1/hr/vacancy
  async findAll(filters: QueryVacancyPositionDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(vacancy_positions),
      filters.organization_id
        ? eq(vacancy_positions.organization_id, filters.organization_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacancy_positions)
        .where(where)
        .orderBy(desc(vacancy_positions.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(vacancy_positions).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // GET /api/v1/hr/vacancy/positions — department_positions list (for vacancy creation form).
  async positionsForVacancy(filters: QueryVacancyPositionDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(department_positions),
      filters.organization_id
        ? eq(department_positions.organization_id, filters.organization_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: department_positions.id,
          organization_id: department_positions.organization_id,
          position_id: department_positions.position_id,
          department_id: department_positions.department_id,
          pos_name: positionsTable.name,
        })
        .from(department_positions)
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, department_positions.position_id),
        )
        .where(where)
        .orderBy(asc(department_positions.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(department_positions)
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // GET /api/v1/hr/vacancy/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select()
      .from(vacancy_positions)
      .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  // GET /api/v1/hr/vacancy/{id}/edit
  async edit(id: number) {
    return this.findOne(id);
  }

  // POST /api/v1/hr/vacancy/positions — create (Laravel: store).
  async create(dto: CreateVacancyPositionDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const organizationId = this.ctx.user_or_fail.organization_id ?? 0;
    await this.db.insert(vacancy_positions).values({
      organization_id: organizationId,
      user_id: userId,
      department_position_id: dto.department_position_id,
      rate: dto.rate,
      city_id: dto.city_id,
      experience: dto.experience,
      salary: dto.salary,
      work_type: dto.work_type,
      education: dto.education,
      address: dto.address ?? null,
      to: dto.to ?? null,
      position_obligations: dto.position_obligations ?? null,
      qualification_requirements: dto.qualification_requirements ?? null,
      working_conditions: dto.working_conditions ?? null,
      specialties: dto.specialties ?? null,
      salary_status: dto.salary_status ?? true,
      phd_status: dto.phd_status ?? false,
    });
  }

  // PUT /api/v1/hr/vacancy/{id}
  async update(id: number, dto: UpdateVacancyPositionDto): Promise<void> {
    await this.findOne(id);
    await this.db
      .update(vacancy_positions)
      .set({
        department_position_id: dto.department_position_id,
        rate: dto.rate,
        city_id: dto.city_id,
        experience: dto.experience,
        salary: dto.salary,
        work_type: dto.work_type,
        education: dto.education,
        address: dto.address ?? null,
        to: dto.to ?? null,
        position_obligations: dto.position_obligations ?? null,
        qualification_requirements: dto.qualification_requirements ?? null,
        working_conditions: dto.working_conditions ?? null,
        specialties: dto.specialties ?? null,
        salary_status: dto.salary_status ?? true,
        phd_status: dto.phd_status ?? false,
        updated_at: sql`NOW()`,
      })
      .where(eq(vacancy_positions.id, id));
  }

  // PUT /api/v1/hr/vacancy/{id}/change-status
  async changeStatus(id: number, dto: ChangeStatusDto): Promise<void> {
    await this.findOne(id);
    const status =
      typeof dto.status === 'boolean'
        ? dto.status
        : dto.status === 1 || dto.status === '1' || dto.status === 'true';
    await this.db
      .update(vacancy_positions)
      .set({ status, updated_at: sql`NOW()` })
      .where(eq(vacancy_positions.id, id));
  }

  // PUT /api/v1/hr/vacancy/{id}/finish
  async finish(id: number): Promise<void> {
    await this.findOne(id);
    await this.db
      .update(vacancy_positions)
      .set({ finish: 2, updated_at: sql`NOW()` })
      .where(eq(vacancy_positions.id, id));
  }

  // DELETE /api/v1/hr/vacancy/{id}
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.db
      .update(vacancy_positions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_positions.id, id));
  }

  // GET /api/v1/hr/vacancy/{id}/applications
  async applications(vacancyId: number, perPage = 10, page = 1) {
    await this.findOne(vacancyId);
    const offset = (page - 1) * perPage;
    const where = and(
      eq(vacancy_applications.vacancy_position_id, vacancyId),
      notDeleted(vacancy_applications),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacancy_applications)
        .where(where)
        .orderBy(desc(vacancy_applications.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacancy_applications)
        .where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}
  async updateApplicationStatus(
    vacancyId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          eq(vacancy_applications.vacancy_position_id, vacancyId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacancy_applications)
      .set({ status: dto.status, updated_at: sql`NOW()` })
      .where(eq(vacancy_applications.id, applicationId));
  }

  // DELETE /api/v1/hr/vacancy/{id}/applications/{aid}
  async removeApplication(
    vacancyId: number,
    applicationId: number,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          eq(vacancy_applications.vacancy_position_id, vacancyId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacancy_applications)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_applications.id, applicationId));
  }

  // GET /api/v1/hr/vacancy/{id}/applications/{aid}/show-user
  async showVacancyUser(_vacancyId: number, applicationId: number) {
    const [app] = await this.db
      .select()
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!app) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const files = await this.db
      .select()
      .from(vacancy_application_files)
      .where(
        and(
          eq(vacancy_application_files.vacancy_application_id, applicationId),
          notDeleted(vacancy_application_files),
        ),
      );
    return {
      application: app,
      files,
    };
  }

  // POST /api/v1/hr/zoom/check-meet — stub.
  async zoomCheckMeeting(meetingId: string) {
    // Laravel: ZoomController::checkMeeting — Zoom API integration.
    return {
      meeting_id: meetingId,
      available: true,
    };
  }

  // POST /api/v1/hr/vacancy/{id}/applications/{aid}/upload — stub.
  async uploadApplicationFile(
    _vacancyId: number,
    applicationId: number,
    fileName?: string,
  ) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return { uploaded: true, file_name: fileName ?? null };
  }

  // POST /api/v1/hr/vacancy/{id}/applications/{aid}/create-meet — stub.
  async createMeet(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return {
      meeting_id: `meet-${applicationId}-${Date.now()}`,
      join_url: 'https://zoom.us/j/placeholder',
    };
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/attach-exam — stub.
  async attachExam(_vacancyId: number, applicationId: number, _examId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/detach-exam — stub.
  async detachExam(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/update-exam — stub.
  async updateExam(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/update — Laravel uses
  // updateApplicationStatus method (alias of update status).
  async updateApplication(
    vacancyId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ) {
    return this.updateApplicationStatus(vacancyId, applicationId, dto);
  }
}
