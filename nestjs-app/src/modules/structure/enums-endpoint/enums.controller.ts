import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { EnumsService } from '@/modules/structure/enums-endpoint/enums.service';

@ApiTags('Structure / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/enums')
export class EnumsController {
  constructor(private readonly service: EnumsService) {}

  @Get()
  @ApiOperation({
    summary:
      'All structure enums (contract_types, schedules, command_types, ...)',
  })
  @ApiOkResponse()
  list() {
    return this.service.list();
  }
}
