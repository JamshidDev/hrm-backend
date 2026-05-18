// Vacancy enums controller. Laravel: routes/api.php inline `enums` route (public).

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyEnumsService } from '@/modules/vacancy/enums-endpoint/enums.service';

@ApiTags('Vacancy / Enums')
@Controller('api/v1/vacancies')
export class VacancyEnumsController {
  constructor(private readonly service: VacancyEnumsService) {}

  @Public()
  @Get('enums')
  @ApiOperation({ summary: 'Vacancy enums (educations, countries, file types, ...)' })
  async enums() {
    return buildSuccess(true, await this.service.enums());
  }
}
