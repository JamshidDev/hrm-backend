// Vacancy controller. Laravel: HR/VacancyPositionController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { VacancyService } from '@/modules/hr/vacancies/vacancy.service';
import {
  QueryVacancyDto,
  VacancyListResponseDto,
} from '@/modules/hr/vacancies/dto/vacancy.dto';

@ApiTags('HR / Vacancies')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/vacancy')
export class VacancyController {
  constructor(private readonly service: VacancyService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Vacancy positions list' })
  @ApiOkResponse({ type: VacancyListResponseDto })
  async findAll(@Query() query: QueryVacancyDto) {
    return this.service.findAll(query);
  }
}
