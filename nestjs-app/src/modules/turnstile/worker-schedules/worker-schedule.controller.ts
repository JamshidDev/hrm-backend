// Worker schedule controller. Laravel: TurnstileWorkerScheduleController +
// TurnstileWorkerScheduleGenerateController + TurnstileTimesheetController +
// TurnstileController::userTimesheetDepartments.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerScheduleService } from '@/modules/turnstile/worker-schedules/worker-schedule.service';

@ApiTags('Turnstile / Worker Schedules')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/schedule')
export class WorkerScheduleController {
  constructor(
    private readonly service: WorkerScheduleService,
    private readonly i18n: I18nService,
  ) {}

  @Get('departments') async listDepartments(@Query() q: any) {
    return buildSuccess(true, await this.service.listDepartments(q));
  }

  // ---------- workers (apiResource) ----------
  @Get('workers') async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }
  @Get('workers/:id') async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }
  @Post('workers') async store(@Body() body: any) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
  @Put('workers/:id') async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Delete('workers/:id') async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // ---------- generation / timesheet ----------
  @Post('generate') async generate(@Body() body: any) {
    return buildSuccess(true, await this.service.generate(body));
  }
  @Post('timesheet/export') async timesheetExport(@Body() body: any) {
    await this.service.exportTimesheet(body);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }
  @Get('workers-with-turnstile') async workersWithTurnstile(@Query() q: any) {
    return buildSuccess(true, await this.service.indexTurnstileSheet(q));
  }
  @Get('get-workers') async getWorkers(@Query() q: any) {
    return buildSuccess(true, await this.service.generateGetWorkers(q));
  }
  @Get('day-in-month') async dayInMonth(@Query() q: any) {
    return buildSuccess(true, this.service.generateDayInMonth(q));
  }
  @Post('generate-schedule') async generateScheduleAction(@Body() body: any) {
    return buildSuccess(true, await this.service.generateScheduleAction(body));
  }
  @Post('generate-schedule-workers') async generateScheduleByWorker(
    @Body() body: any,
  ) {
    return buildSuccess(
      true,
      await this.service.generateScheduleByWorker(body),
    );
  }
  @Post('schedule-workers-replacement') async replacementWorkers(
    @Body() body: any,
  ) {
    await this.service.replacementWorkers(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Post('generate-turnstile-schedule') async generateTurnstileSchedule(
    @Body() body: any,
  ) {
    return buildSuccess(
      true,
      await this.service.generateTurnstileSchedule(body),
    );
  }
}
