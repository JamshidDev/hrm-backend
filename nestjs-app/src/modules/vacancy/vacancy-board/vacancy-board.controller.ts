// Vacancy board controller. Laravel: Vacancy/VacancyController.
// Barcha endpointlar ochiq (public) — auth talab qilmaydi.

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyBoardService } from '@/modules/vacancy/vacancy-board/vacancy-board.service';
import { QueryVacancyBoardDto } from '@/modules/vacancy/vacancy-board/dto/vacancy-board.dto';

@ApiTags('Vacancy / Board')
@Controller('api/v1/vacancies')
export class VacancyBoardController {
  constructor(private readonly service: VacancyBoardService) {}

  @Public()
  @Get('organizations')
  @ApiOperation({ summary: 'Organizations with active vacancies' })
  async organizations() {
    return buildSuccess(true, await this.service.organizations());
  }

  @Public()
  @Get('report')
  @ApiOperation({ summary: 'Paginated list of vacancy positions' })
  async report(@Query() query: QueryVacancyBoardDto) {
    return buildSuccess(true, await this.service.report(query));
  }

  @Public()
  @Get('report/:id')
  @ApiOperation({ summary: 'Single vacancy position by id' })
  async reportShow(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.reportShow(id));
  }

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'Short list of active vacancies (latest 50)' })
  async list() {
    return buildSuccess(true, await this.service.list());
  }

  @Public()
  @Get('regions')
  @ApiOperation({ summary: 'Regions list' })
  async regions() {
    return buildSuccess(true, await this.service.regions());
  }

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'Cities list' })
  async cities() {
    return buildSuccess(true, await this.service.cities());
  }
}
