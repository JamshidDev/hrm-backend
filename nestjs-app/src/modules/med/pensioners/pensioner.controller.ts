// Med pensioners controller. Laravel: HR/PensionerController->listMed.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { MedPensionerService } from '@/modules/med/pensioners/pensioner.service';

@ApiTags('Med / Pensioners')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/med')
export class MedPensionerController {
  constructor(private readonly service: MedPensionerService) {}

  @Get('pensioners')
  @ApiOperation({ summary: 'List pensioners for medical check context' })
  async list(@Query() query: any) {
    return buildSuccess(true, await this.service.list(query));
  }
}
