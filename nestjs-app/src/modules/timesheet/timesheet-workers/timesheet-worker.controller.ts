// TimeSheetWorker controller. Laravel: TimeSheetWorkerController.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TimeSheetWorkerService } from '@/modules/timesheet/timesheet-workers/timesheet-worker.service';
import {
  CheckWorkerQueryDto,
  QueryTimeSheetWorkersDto,
  StoreTimeSheetWorkersDto,
  TimeSheetWorkerListResponseDto,
} from '@/modules/timesheet/timesheet-workers/dto/timesheet-worker.dto';

@ApiTags('TimeSheet / Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/timesheet')
export class TimeSheetWorkerController {
  constructor(
    private readonly service: TimeSheetWorkerService,
    private readonly i18n: I18nService,
  ) {}

  @Get('check-worker')
  @ApiOperation({ summary: 'Worker positions by PIN (active only)' })
  async checkWorker(@Query() query: CheckWorkerQueryDto) {
    const data = await this.service.checkWorker(query.pin);
    return buildSuccess(true, data);
  }

  @Get(':id/workers')
  @ApiOperation({ summary: 'Workers in timesheet (with days)' })
  @ApiOkResponse({ type: TimeSheetWorkerListResponseDto })
  async findAll(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryTimeSheetWorkersDto,
  ) {
    const perPage = query.per_page ?? 50;
    const page = query.page ?? 1;
    return this.service.findAll(id, perPage, page);
  }

  @Post(':id/workers')
  @ApiOperation({ summary: 'Upsert or delete worker timesheet entries' })
  async store(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StoreTimeSheetWorkersDto,
  ) {
    await this.service.store(id, dto);
    return buildSuccess(this.i18n.t('messages.create_success'), []);
  }

  @Get(':id/day-in-month')
  @ApiOperation({ summary: 'Days in month with holiday markers' })
  async dayInMonth(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.dayInMonth(id));
  }
}
