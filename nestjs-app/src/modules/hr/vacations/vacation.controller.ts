// Vacation controller. Laravel: HR/VacationController.

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { VacationService } from '@/modules/hr/vacations/vacation.service';
import {
  QueryVacationDto,
  VacationCalculateDto,
  VacationCreateDto,
  VacationListResponseDto,
} from '@/modules/hr/vacations/dto/vacation.dto';

@ApiTags('HR / Vacations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/vacations')
export class VacationController {
  constructor(private readonly service: VacationService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Vacations list (to >= today)' })
  @ApiOkResponse({ type: VacationListResponseDto })
  async findAll(@Query() query: QueryVacationDto) {
    return this.service.findAll(query);
  }

  @Post('create')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Get latest vacation per worker_position (worker_positions[])',
  })
  async getLastVacations(@Body() dto: VacationCreateDto) {
    return buildSuccess(true, await this.service.create(dto));
  }

  @Post('calculate')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Calculate vacation period/dates for input worker_positions',
  })
  async calculate(@Body() dto: VacationCalculateDto) {
    return buildSuccess(true, await this.service.calculate(dto));
  }
}
