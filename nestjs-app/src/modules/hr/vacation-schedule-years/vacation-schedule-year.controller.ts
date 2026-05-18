// VacationScheduleYear controller. Laravel: HR/VacationScheduleYearController.

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { VacationScheduleYearService } from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.service';
import {
  QueryVacationScheduleYearDto,
  StoreVacationScheduleYearDto,
  VacationScheduleYearListResponseDto,
} from '@/modules/hr/vacation-schedule-years/dto/vacation-schedule-year.dto';

@ApiTags('HR / Vacation Schedule Years')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/vacation-schedule')
export class VacationScheduleYearController {
  constructor(
    private readonly service: VacationScheduleYearService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Vacation schedule years list' })
  @ApiOkResponse({ type: VacationScheduleYearListResponseDto })
  async findAll(@Query() query: QueryVacationScheduleYearDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Create/update vacation schedule year + assignments' })
  async store(@Body() dto: StoreVacationScheduleYearDto) {
    await this.service.store(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get(':id/auto-generate')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Auto-generate vacation distribution' })
  async autoGenerate(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.autoGenerate(id));
  }
}

// GET /api/v1/hr/vacation-schedule-workers
@ApiTags('HR / Vacation Schedule Years')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class VacationScheduleYearWorkersController {
  constructor(private readonly service: VacationScheduleYearService) {}

  @Get('vacation-schedule-workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Workers eligible for vacation schedule assignment' })
  async workers(@Query() query: QueryVacationScheduleYearDto) {
    return buildSuccess(true, await this.service.workers(query));
  }
}
