// LMS module — Laravel: Modules/LMS (35 routes).
// Real CRUD: directions, subjects, specializations, edu-plans, teachers, lessons.
// Stubs: group generation, exam attach, certificate generation, zoom meetings.

import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, max, sql } from 'drizzle-orm';
import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  directions,
  subjects,
  specializations,
  edu_plans,
  teachers,
  lessons,
  edu_plan_workers,
  edu_plan_exams,
  lms_certificates,
  lms_protocols,
} from '@/db/schema';

class PageQuery {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

class NameDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ru?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
}

class SpecializationDto extends NameDto {
  @ApiProperty() @IsInt() direction_id!: number;
}

class EduPlanDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsInt() learning_center_id!: number;
  @ApiProperty() @IsInt() specialization_id!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() type?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() start_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() count_groups?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() count_workers?: number;
}

class TeacherDto {
  @ApiProperty() @IsInt() learning_center_id!: number;
  @ApiProperty() @IsInt() worker_id!: number;
}

class LessonDto {
  @ApiProperty() @IsInt() learning_center_id!: number;
  @ApiProperty() @IsInt() edu_plan_id!: number;
  @ApiProperty() @IsInt() group_id!: number;
  @ApiProperty() @IsInt() subject_id!: number;
  @ApiProperty() @IsInt() teacher_id!: number;
  @ApiProperty() @IsString() lesson_date!: string;
  @ApiProperty() @IsString() start_time!: string;
  @ApiProperty() @IsString() end_time!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
}

@Injectable()
class LmsService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private pageOf(q?: PageQuery) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    return { page, perPage, offset: (page - 1) * perPage };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async nextId(table: any): Promise<number> {
    const [{ m }] = await this.db.select({ m: max(table.id) }).from(table);
    return Number(m ?? 0) + 1;
  }

  // Generic paginate with soft-delete.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async paginate(table: any, q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(table);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(table).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // ---------- Directions ----------
  async listDirections(q: PageQuery) { return this.paginate(directions, q); }
  async showDirection(id: number) { const [r] = await this.db.select().from(directions).where(eq(directions.id, id)).limit(1); return r ?? null; }
  async createDirection(dto: NameDto) {
    const id = await this.nextId(directions);
    await this.db.insert(directions).values({ id, name: dto.name, name_ru: dto.name_ru ?? null, name_en: dto.name_en ?? null });
  }
  async updateDirection(id: number, dto: NameDto) {
    await this.db.update(directions).set({ name: dto.name, name_ru: dto.name_ru ?? null, name_en: dto.name_en ?? null, updated_at: sql`NOW()` }).where(eq(directions.id, id));
  }
  async removeDirection(id: number) {
    await this.db.update(directions).set({ deleted_at: sql`NOW()` }).where(eq(directions.id, id));
  }

  // ---------- Subjects ----------
  async listSubjects(q: PageQuery) { return this.paginate(subjects, q); }
  async showSubject(id: number) { const [r] = await this.db.select().from(subjects).where(eq(subjects.id, id)).limit(1); return r ?? null; }
  async createSubject(dto: NameDto) {
    const id = await this.nextId(subjects);
    await this.db.insert(subjects).values({ id, name: dto.name, name_ru: dto.name_ru ?? null, name_en: dto.name_en ?? null });
  }
  async updateSubject(id: number, dto: NameDto) {
    await this.db.update(subjects).set({ name: dto.name, name_ru: dto.name_ru ?? null, name_en: dto.name_en ?? null, updated_at: sql`NOW()` }).where(eq(subjects.id, id));
  }
  async removeSubject(id: number) {
    await this.db.update(subjects).set({ deleted_at: sql`NOW()` }).where(eq(subjects.id, id));
  }

  // ---------- Specializations ----------
  async listSpecializations(q: PageQuery) { return this.paginate(specializations, q); }
  async showSpecialization(id: number) { const [r] = await this.db.select().from(specializations).where(eq(specializations.id, id)).limit(1); return r ?? null; }
  async createSpecialization(dto: SpecializationDto) {
    const id = await this.nextId(specializations);
    await this.db.insert(specializations).values({
      id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      direction_id: dto.direction_id,
    });
  }
  async updateSpecialization(id: number, dto: SpecializationDto) {
    await this.db.update(specializations).set({
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      direction_id: dto.direction_id,
      updated_at: sql`NOW()`,
    }).where(eq(specializations.id, id));
  }
  async removeSpecialization(id: number) {
    await this.db.update(specializations).set({ deleted_at: sql`NOW()` }).where(eq(specializations.id, id));
  }

  // ---------- Edu Plans ----------
  async listEduPlans(q: PageQuery) { return this.paginate(edu_plans, q); }
  async showEduPlan(id: number) { const [r] = await this.db.select().from(edu_plans).where(eq(edu_plans.id, id)).limit(1); return r ?? null; }
  async createEduPlan(dto: EduPlanDto) {
    const id = await this.nextId(edu_plans);
    await this.db.insert(edu_plans).values({
      id,
      name: dto.name,
      learning_center_id: dto.learning_center_id,
      specialization_id: dto.specialization_id,
      type: dto.type ?? 1,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
      hours: dto.hours ?? null,
      count_groups: dto.count_groups ?? 1,
      count_workers: dto.count_workers ?? 30,
    });
  }
  async updateEduPlan(id: number, dto: EduPlanDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.learning_center_id !== undefined) data.learning_center_id = dto.learning_center_id;
    if (dto.specialization_id !== undefined) data.specialization_id = dto.specialization_id;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.start_date !== undefined) data.start_date = dto.start_date;
    if (dto.end_date !== undefined) data.end_date = dto.end_date;
    if (dto.hours !== undefined) data.hours = dto.hours;
    if (dto.count_groups !== undefined) data.count_groups = dto.count_groups;
    if (dto.count_workers !== undefined) data.count_workers = dto.count_workers;
    await this.db.update(edu_plans).set(data).where(eq(edu_plans.id, id));
  }
  async removeEduPlan(id: number) {
    await this.db.update(edu_plans).set({ deleted_at: sql`NOW()` }).where(eq(edu_plans.id, id));
  }

  async attachedWorkersToEduPlan(eduPlanId: number, q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = and(eq(edu_plan_workers.edu_plan_id, eduPlanId), notDeleted(edu_plan_workers));
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(edu_plan_workers).where(where).orderBy(desc(edu_plan_workers.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(edu_plan_workers).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async detachWorkerInEduPlan(eduPlanId: number, body: { worker_ids?: number[] }) {
    if (body.worker_ids?.length) {
      await this.db
        .update(edu_plan_workers)
        .set({ deleted_at: sql`NOW()` })
        .where(eq(edu_plan_workers.edu_plan_id, eduPlanId));
    }
    return { success: true };
  }

  // ---------- Teachers ----------
  async listTeachers(q: PageQuery) { return this.paginate(teachers, q); }
  async showTeacher(id: number) { const [r] = await this.db.select().from(teachers).where(eq(teachers.id, id)).limit(1); return r ?? null; }
  async createTeacher(dto: TeacherDto) {
    const id = await this.nextId(teachers);
    await this.db.insert(teachers).values({ id, learning_center_id: dto.learning_center_id, worker_id: dto.worker_id });
  }
  async updateTeacher(id: number, dto: TeacherDto) {
    await this.db.update(teachers).set({
      learning_center_id: dto.learning_center_id,
      worker_id: dto.worker_id,
      updated_at: sql`NOW()`,
    }).where(eq(teachers.id, id));
  }
  async removeTeacher(id: number) {
    await this.db.update(teachers).set({ deleted_at: sql`NOW()` }).where(eq(teachers.id, id));
  }

  // ---------- Lessons ----------
  async listLessons(q: PageQuery) { return this.paginate(lessons, q); }
  async showLesson(id: number) { const [r] = await this.db.select().from(lessons).where(eq(lessons.id, id)).limit(1); return r ?? null; }
  async createLesson(dto: LessonDto) {
    const id = await this.nextId(lessons);
    await this.db.insert(lessons).values({
      id,
      learning_center_id: dto.learning_center_id,
      edu_plan_id: dto.edu_plan_id,
      group_id: dto.group_id,
      subject_id: dto.subject_id,
      teacher_id: dto.teacher_id,
      name: dto.name ?? null,
      lesson_date: dto.lesson_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
    });
  }
  async updateLesson(id: number, dto: LessonDto) {
    await this.db.update(lessons).set({
      learning_center_id: dto.learning_center_id,
      edu_plan_id: dto.edu_plan_id,
      group_id: dto.group_id,
      subject_id: dto.subject_id,
      teacher_id: dto.teacher_id,
      name: dto.name ?? null,
      lesson_date: dto.lesson_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      updated_at: sql`NOW()`,
    }).where(eq(lessons.id, id));
  }
  async removeLesson(id: number) {
    await this.db.update(lessons).set({ deleted_at: sql`NOW()` }).where(eq(lessons.id, id));
  }

  // ---------- Groups ----------
  async generateGroups(_body: unknown) { return { success: true, stub: true }; }
  async detachWorkersInGroups(_body: unknown) { return { success: true, stub: true }; }
  async groups(_q: PageQuery) { return { current_page: 1, per_page: 10, total: 0, data: [] }; }
  async groupWorkers(_q: PageQuery) { return { current_page: 1, per_page: 10, total: 0, data: [] }; }

  async protocol(q: PageQuery) {
    return this.paginate(lms_protocols, q);
  }

  async workerExams(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }

  // ---------- Enums / Lookups ----------
  enums() {
    return {
      types: [
        { id: 1, name: 'Sirtqi' },
        { id: 2, name: 'Kunduzgi' },
      ],
      statuses: [
        { id: 1, name: 'Yangi' },
        { id: 2, name: 'Yakunlangan' },
      ],
    };
  }

  async learningCenters() {
    // Stub: would query organizations with learning_center type
    return [];
  }

  async listDirectionsBrief() {
    return this.db.select({ id: directions.id, name: directions.name }).from(directions).where(notDeleted(directions));
  }
  async listSpecializationsBrief() {
    return this.db.select({ id: specializations.id, name: specializations.name }).from(specializations).where(notDeleted(specializations));
  }
  async listEduPlansBrief() {
    return this.db.select({ id: edu_plans.id, name: edu_plans.name }).from(edu_plans).where(notDeleted(edu_plans));
  }
  async listGroups() {
    return [];
  }

  // ---------- Certificates ----------
  async listCertificates(q: PageQuery) {
    return this.paginate(lms_certificates, q);
  }
  async destroyCertificate(id: number) {
    await this.db.update(lms_certificates).set({ deleted_at: sql`NOW()` }).where(eq(lms_certificates.id, id));
  }
  async generateCertificate(_body: unknown) {
    return { success: true, stub: true };
  }

  // ---------- Lessons / Meet / Participants ----------
  async showParticipants(_lessonId: number) {
    return [];
  }
  async createZoomMeeting(_lessonId: number) {
    return { success: true, stub: true, url: '', meeting_id: '' };
  }

  // ---------- Teachers / Listeners ----------
  async teacherLessons(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }
  async listenerIndex(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }
  async listenerLessons(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }
  async startListenerLesson(_lessonId: number) {
    return { success: true, stub: true };
  }

  // ---------- Edu Plan Exams ----------
  async eduPlanExamsList(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }
  async attachExamToEduPlan(body: any) {
    const id = await this.nextId(edu_plan_exams);
    await this.db.insert(edu_plan_exams).values({
      id,
      edu_plan_id: body.edu_plan_id,
      exam_id: body.exam_id,
      exam_type: body.exam_type ?? 3,
      lesson_id: body.lesson_id ?? null,
    });
    return { success: true, id };
  }
  async examResults(_q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }
  async detachExamFromEduPlan(examId: number) {
    await this.db.delete(edu_plan_exams).where(eq(edu_plan_exams.id, examId));
    return { success: true };
  }

  // ---------- Zoom Webhook ----------
  async zoomWebhook(_body: unknown) {
    return { success: true };
  }
}

@ApiTags('Zoom / Webhook')
@Controller('api/v1/zoom')
class ZoomWebhookController {
  constructor(private readonly s: LmsService) {}

  @Public()
  @Post('webhook')
  async webhook(@Body() body: any) {
    return buildSuccess(true, await this.s.zoomWebhook(body));
  }
}

@ApiTags('LMS')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
class LmsController {
  constructor(private readonly s: LmsService, private readonly i18n: I18nService) {}

  // directions
  @Get('directions') async listDirections(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listDirections(q)); }
  @Get('directions/:id') async showDirection(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showDirection(id)); }
  @Post('directions') async createDirection(@Body() dto: NameDto) { await this.s.createDirection(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('directions/:id') async updateDirection(@Param('id', ParseIntPipe) id: number, @Body() dto: NameDto) { await this.s.updateDirection(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('directions/:id') async removeDirection(@Param('id', ParseIntPipe) id: number) { await this.s.removeDirection(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }

  // subjects
  @Get('subjects') async listSubjects(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listSubjects(q)); }
  @Get('subjects/:id') async showSubject(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showSubject(id)); }
  @Post('subjects') async createSubject(@Body() dto: NameDto) { await this.s.createSubject(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('subjects/:id') async updateSubject(@Param('id', ParseIntPipe) id: number, @Body() dto: NameDto) { await this.s.updateSubject(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('subjects/:id') async removeSubject(@Param('id', ParseIntPipe) id: number) { await this.s.removeSubject(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }

  // specializations
  @Get('specializations') async listSpecializations(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listSpecializations(q)); }
  @Get('specializations/:id') async showSpecialization(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showSpecialization(id)); }
  @Post('specializations') async createSpecialization(@Body() dto: SpecializationDto) { await this.s.createSpecialization(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('specializations/:id') async updateSpecialization(@Param('id', ParseIntPipe) id: number, @Body() dto: SpecializationDto) { await this.s.updateSpecialization(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('specializations/:id') async removeSpecialization(@Param('id', ParseIntPipe) id: number) { await this.s.removeSpecialization(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }

  // edu-plan
  @Get('edu-plan') async listEduPlans(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listEduPlans(q)); }
  @Get('edu-plan/:id') async showEduPlan(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showEduPlan(id)); }
  @Post('edu-plan') async createEduPlan(@Body() dto: EduPlanDto) { await this.s.createEduPlan(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('edu-plan/:id') async updateEduPlan(@Param('id', ParseIntPipe) id: number, @Body() dto: EduPlanDto) { await this.s.updateEduPlan(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('edu-plan/:id') async removeEduPlan(@Param('id', ParseIntPipe) id: number) { await this.s.removeEduPlan(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }
  @Get('edu-plans/:eduPlanId/attached-workers') async attachedWorkers(@Param('eduPlanId', ParseIntPipe) id: number, @Query() q: PageQuery) {
    return buildSuccess(true, await this.s.attachedWorkersToEduPlan(id, q));
  }
  @Post('edu-plans/:eduPlanId/detach-workers') async detachWorkers(@Param('eduPlanId', ParseIntPipe) id: number, @Body() body: any) {
    return buildSuccess(true, await this.s.detachWorkerInEduPlan(id, body));
  }

  // teachers
  @Get('teachers') async listTeachers(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listTeachers(q)); }
  @Get('teachers/:id') async showTeacher(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showTeacher(id)); }
  @Post('teachers') async createTeacher(@Body() dto: TeacherDto) { await this.s.createTeacher(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('teachers/:id') async updateTeacher(@Param('id', ParseIntPipe) id: number, @Body() dto: TeacherDto) { await this.s.updateTeacher(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('teachers/:id') async removeTeacher(@Param('id', ParseIntPipe) id: number) { await this.s.removeTeacher(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }

  // lessons
  @Get('lessons') async listLessons(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listLessons(q)); }
  @Get('lessons/:id') async showLesson(@Param('id', ParseIntPipe) id: number) { return buildSuccess(true, await this.s.showLesson(id)); }
  @Post('lessons') async createLesson(@Body() dto: LessonDto) { await this.s.createLesson(dto); return buildSuccess(this.i18n.t('messages.successfully_stored'), []); }
  @Put('lessons/:id') async updateLesson(@Param('id', ParseIntPipe) id: number, @Body() dto: LessonDto) { await this.s.updateLesson(id, dto); return buildSuccess(this.i18n.t('messages.successfully_updated'), []); }
  @Delete('lessons/:id') async removeLesson(@Param('id', ParseIntPipe) id: number) { await this.s.removeLesson(id); return buildSuccess(this.i18n.t('messages.successfully_deleted'), []); }
  @Get('lessons/:lesson/show-participants') async showParticipants(@Param('lesson', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.s.showParticipants(lessonId));
  }
  @Get('lessons/:lesson/create-meet') async createZoomMeeting(@Param('lesson', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.s.createZoomMeeting(lessonId));
  }

  // groups
  @Post('generate-groups') async generateGroups(@Body() body: any) {
    return buildSuccess(true, await this.s.generateGroups(body));
  }
  @Post('detach-workers-in-group') async detachWorkersInGroups(@Body() body: any) {
    return buildSuccess(true, await this.s.detachWorkersInGroups(body));
  }
  @Get('enums') async enums() { return buildSuccess(true, this.s.enums()); }
  @Get('learning-centers') async learningCenters() { return buildSuccess(true, await this.s.learningCenters()); }
  @Get('groups') async groups(@Query() q: PageQuery) { return buildSuccess(true, await this.s.groups(q)); }
  @Get('group-workers') async groupWorkers(@Query() q: PageQuery) { return buildSuccess(true, await this.s.groupWorkers(q)); }
  @Get('protocol') async protocol(@Query() q: PageQuery) { return buildSuccess(true, await this.s.protocol(q)); }
  @Get('worker-exams') async workerExams(@Query() q: PageQuery) { return buildSuccess(true, await this.s.workerExams(q)); }

  // certificates
  @Get('certificates') async listCertificates(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listCertificates(q)); }
  @Delete('certificates/:id') async destroyCertificate(@Param('id', ParseIntPipe) id: number) {
    await this.s.destroyCertificate(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
  @Post('certificate/generate') async generateCertificate(@Body() body: any) {
    return buildSuccess(true, await this.s.generateCertificate(body));
  }

  // lists
  @Get('list/directions') async listDirectionsBrief() { return buildSuccess(true, await this.s.listDirectionsBrief()); }
  @Get('list/specializations') async listSpecializationsBrief() { return buildSuccess(true, await this.s.listSpecializationsBrief()); }
  @Get('list/edu-plans') async listEduPlansBrief() { return buildSuccess(true, await this.s.listEduPlansBrief()); }
  @Get('list/groups') async listGroups() { return buildSuccess(true, await this.s.listGroups()); }

  // teacher
  @Get('teacher/lessons') async teacherLessons(@Query() q: PageQuery) { return buildSuccess(true, await this.s.teacherLessons(q)); }

  // exams (edu plan)
  @Get('exams') async eduPlanExamsList(@Query() q: PageQuery) { return buildSuccess(true, await this.s.eduPlanExamsList(q)); }
  @Post('exams/attach') async attachExam(@Body() body: any) { return buildSuccess(true, await this.s.attachExamToEduPlan(body)); }
  @Get('exams/result') async examResults(@Query() q: PageQuery) { return buildSuccess(true, await this.s.examResults(q)); }
  @Get('exams/detach/:examId') async detachExam(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.s.detachExamFromEduPlan(examId));
  }

  // listeners
  @Get('listener') async listenerIndex(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listenerIndex(q)); }
  @Get('listener/lessons') async listenerLessons(@Query() q: PageQuery) { return buildSuccess(true, await this.s.listenerLessons(q)); }
  @Get('listener/lessons/:lessonId') async startListenerLesson(@Param('lessonId', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.s.startListenerLesson(lessonId));
  }
}

@Module({
  imports: [AuthModule],
  controllers: [LmsController, ZoomWebhookController],
  providers: [LmsService],
})
export class LmsModule {}
