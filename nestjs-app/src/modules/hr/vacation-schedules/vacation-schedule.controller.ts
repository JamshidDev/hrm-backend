// VacationSchedule controller. Laravel: HR/VacationScheduleController.

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
import { VacationScheduleService } from '@/modules/hr/vacation-schedules/vacation-schedule.service';
import {
  CreateVacationScheduleDto,
  QueryVacationScheduleDto,
  UpdateVacationScheduleDto,
  VacationScheduleListResponseDto,
} from '@/modules/hr/vacation-schedules/dto/vacation-schedule.dto';

@ApiTags('HR / Vacation Schedules')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/vacation-schedules')
export class VacationScheduleController {
  constructor(
    private readonly service: VacationScheduleService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Vacation schedules list' })
  @ApiOkResponse({ type: VacationScheduleListResponseDto })
  async findAll(@Query() query: QueryVacationScheduleDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateVacationScheduleDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVacationScheduleDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Laravel: GET /api/v1/hr/vacation-schedules-not-included
@ApiTags('HR / Vacation Schedules')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class VacationSchedulesExtrasController {
  constructor(private readonly service: VacationScheduleService) {}

  @Get('vacation-schedules-not-included')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Workers without vacation schedule yet' })
  async notIncluded(@Query() query: QueryVacationScheduleDto) {
    return buildSuccess(true, await this.service.noVacationScheduleWorkers(query));
  }
}
