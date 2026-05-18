// Integration module — Laravel: Modules/Integration (34 routes).
// External system integration endpoints. Most are list/lookup style.
// Real reads where DB-backed; stubs for complex external integrations
// (mobile-face HMAC, salary lookups).

import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { and, count, desc, eq, inArray, ilike, sql } from 'drizzle-orm';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  workers,
  worker_positions,
  organizations,
  departments,
  positions,
  contracts,
  meds,
} from '@/db/schema';

class PageQuery {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

@Injectable()
class IntegrationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private pageOf(q?: PageQuery) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    return { page, perPage, offset: (page - 1) * perPage };
  }

  // ---------- Workers ----------
  async listWorkers(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const conds: any[] = [notDeleted(workers)];
    if (q.search) {
      conds.push(
        sql`(${workers.last_name} ILIKE ${'%' + q.search + '%'} OR ${workers.first_name} ILIKE ${'%' + q.search + '%'} OR ${workers.middle_name} ILIKE ${'%' + q.search + '%'})`,
      );
    }
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(workers).where(where).orderBy(desc(workers.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(workers).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async workersByPins(body: { pins?: number[] }) {
    if (!body.pins?.length) return [];
    return this.db.select().from(workers).where(and(inArray(workers.pin, body.pins), notDeleted(workers)));
  }

  // ---------- Dashboard ----------
  async dashboard() {
    const [workerStat, deptStat, orgStat] = await Promise.all([
      this.db.select({ total: count() }).from(workers).where(notDeleted(workers)),
      this.db.select({ total: count() }).from(departments).where(notDeleted(departments)),
      this.db.select({ total: count() }).from(organizations).where(notDeleted(organizations)),
    ]);
    return {
      workers_count: Number(workerStat[0].total),
      departments_count: Number(deptStat[0].total),
      organizations_count: Number(orgStat[0].total),
    };
  }

  // ---------- Structure ----------
  async structure(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(organizations);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(organizations).where(where).orderBy(organizations.id).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(organizations).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async organizationLeaders(_organizationId: number) {
    return [];
  }

  async listDepartments(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(departments);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(departments).where(where).orderBy(departments.id).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async listPositions(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(positions);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(positions).where(where).orderBy(positions.id).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(positions).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async getDepartmentsAll() {
    return this.db.select({ id: departments.id, name: departments.name }).from(departments).where(notDeleted(departments));
  }

  async getPositions(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(positions);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(positions).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(positions).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  enums() {
    return {
      genders: [
        { id: 1, name: 'Erkak' },
        { id: 2, name: 'Ayol' },
      ],
      contract_types: [
        { id: 1, name: 'Doimiy' },
        { id: 2, name: 'Vaqtinchalik' },
      ],
    };
  }

  async kpiReport(_q: PageQuery) {
    return { stub: true, data: [] };
  }

  // ---------- Meds / Contracts ----------
  async listMeds(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(meds);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(meds).where(where).orderBy(desc(meds.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(meds).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async workerMeds(workerId: number, q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = and(eq(meds.worker_id, workerId), notDeleted(meds));
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(meds).where(where).orderBy(desc(meds.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(meds).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async listContracts(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(contracts);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(contracts).where(where).orderBy(desc(contracts.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(contracts).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async listClassificationPositions(q: PageQuery) {
    return this.listPositions(q);
  }

  // ---------- Stations ----------
  async stationWorkers(_code: string, _q: PageQuery) {
    return { current_page: 1, per_page: 10, total: 0, data: [] };
  }

  async stationWorker(_code: string, workerId: number) {
    const [row] = await this.db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    return row ?? null;
  }

  async stationWorkerResume(_code: string, _workerId: number) {
    return { url: '', stub: true };
  }

  async stationStats(_code: string) {
    return { workers_count: 0, departments_count: 0, stub: true };
  }

  // ---------- Worker lookups ----------
  async workerByPin(q: { pin?: number }) {
    if (!q.pin) return null;
    const [row] = await this.db.select().from(workers).where(and(eq(workers.pin, Number(q.pin)), notDeleted(workers))).limit(1);
    return row ?? null;
  }

  async showWorker(workerUuid: string) {
    const [row] = await this.db.select().from(workers).where(eq(workers.uuid, workerUuid)).limit(1);
    return row ?? null;
  }

  async showWorkerTurnstileEventsByMonth(_workerUuid: string, _q: PageQuery) {
    return [];
  }

  async showWorkerTurnstileEventsByDay(_workerUuid: string, _q: PageQuery) {
    return [];
  }

  async workerSalary(_body: unknown) {
    return { current_page: 1, per_page: 10, total: 0, data: [], stub: true };
  }

  async workerSalaryMonths(_body: unknown) {
    return [];
  }

  async checkWorker(_body: unknown) {
    return { exists: false, worker: null, stub: true };
  }

  // ---------- Mobile Face (HMAC, public) ----------
  async mfSendEvent(_body: unknown) {
    return { success: true, stub: true };
  }

  async mfCheckWorker(_body: unknown) {
    return { exists: false, stub: true };
  }

  async mfSchedules(_body: unknown) {
    return { stub: true, data: [] };
  }
}

@ApiTags('Integration')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/integration')
class IntegrationController {
  constructor(private readonly s: IntegrationService) {}

  @Get('workers') async listWorkers(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listWorkers(q));
  }
  @Post('workers/by-pins') async workersByPins(@Body() body: any) {
    return buildSuccess(true, await this.s.workersByPins(body));
  }
  @Get('dashboard') async dashboard() {
    return buildSuccess(true, await this.s.dashboard());
  }
  @Get('structure') async structure(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.structure(q));
  }
  @Get('structure/:organizationId/leaders') async leaders(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return buildSuccess(true, await this.s.organizationLeaders(organizationId));
  }
  @Get('departments') async departments(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listDepartments(q));
  }
  @Get('positions') async positions(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listPositions(q));
  }
  @Get('get-departments') async getDepartmentsAll() {
    return buildSuccess(true, await this.s.getDepartmentsAll());
  }
  @Get('get-positions') async getPositions(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.getPositions(q));
  }
  @Get('enums') async enums() {
    return buildSuccess(true, this.s.enums());
  }
  @Get('kpi/report') async kpiReport(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.kpiReport(q));
  }

  @Get('meds') async listMeds(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listMeds(q));
  }
  @Get('workers/:id/meds') async workerMeds(@Param('id', ParseIntPipe) id: number, @Query() q: PageQuery) {
    return buildSuccess(true, await this.s.workerMeds(id, q));
  }
  @Get('contracts') async listContracts(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listContracts(q));
  }
  @Get('classifications/positions') async listClassificationPositions(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listClassificationPositions(q));
  }

  // stations
  @Get('stations/:code/workers') async stationWorkers(@Param('code') code: string, @Query() q: PageQuery) {
    return buildSuccess(true, await this.s.stationWorkers(code, q));
  }
  @Get('stations/:code/workers/:workerId') async stationWorker(
    @Param('code') code: string,
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    return buildSuccess(true, await this.s.stationWorker(code, workerId));
  }
  @Get('stations/:code/workers/:workerId/resume') async stationWorkerResume(
    @Param('code') code: string,
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    return buildSuccess(true, await this.s.stationWorkerResume(code, workerId));
  }
  @Get('stations/:code/stats') async stationStats(@Param('code') code: string) {
    return buildSuccess(true, await this.s.stationStats(code));
  }

  // worker lookups
  @Get('worker-by-pin') async workerByPin(@Query() q: any) {
    return buildSuccess(true, await this.s.workerByPin(q));
  }
  @Get('worker/show/:workerUuid') async showWorker(@Param('workerUuid') uuid: string) {
    return buildSuccess(true, await this.s.showWorker(uuid));
  }
  @Get('worker/turnstile-events-month/:workerUuid') async showEventsByMonth(@Param('workerUuid') uuid: string, @Query() q: PageQuery) {
    return buildSuccess(true, await this.s.showWorkerTurnstileEventsByMonth(uuid, q));
  }
  @Get('worker/turnstile-events-day/:workerUuid') async showEventsByDay(@Param('workerUuid') uuid: string, @Query() q: PageQuery) {
    return buildSuccess(true, await this.s.showWorkerTurnstileEventsByDay(uuid, q));
  }

  @Post('worker/salary') async workerSalary(@Body() body: any) {
    return buildSuccess(true, await this.s.workerSalary(body));
  }
  @Post('worker/get-salary-months') async workerSalaryMonths(@Body() body: any) {
    return buildSuccess(true, await this.s.workerSalaryMonths(body));
  }
  @Post('worker/check') async checkWorker(@Body() body: any) {
    return buildSuccess(true, await this.s.checkWorker(body));
  }
}

// Mobile-face uses HMAC auth in Laravel. We expose them as @Public() stubs.
@ApiTags('Integration / Mobile Face')
@Controller('api/v1/integration/mobile-face')
class MobileFaceController {
  constructor(private readonly s: IntegrationService) {}

  @Public()
  @Post('send-event') @ApiOperation({ summary: 'Mobile face send event (HMAC-protected; stub here)' })
  async sendEvent(@Body() body: any) {
    return buildSuccess(true, await this.s.mfSendEvent(body));
  }

  @Public()
  @Post('check-worker') @ApiOperation({ summary: 'Mobile face check worker (HMAC-protected; stub here)' })
  async checkWorker(@Body() body: any) {
    return buildSuccess(true, await this.s.mfCheckWorker(body));
  }

  @Public()
  @Post('schedules') @ApiOperation({ summary: 'Mobile face schedules (HMAC-protected; stub here)' })
  async schedules(@Body() body: any) {
    return buildSuccess(true, await this.s.mfSchedules(body));
  }
}

@Module({
  imports: [AuthModule],
  controllers: [IntegrationController, MobileFaceController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
