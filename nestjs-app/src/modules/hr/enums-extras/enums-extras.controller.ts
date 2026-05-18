// HR Enum extras controller.
// Routes:
//   - GET /api/v1/hr/enums/contract-additional-types
//   - GET /api/v1/hr/enums/command-types
//   - GET /api/v1/hr/enums/reason-types

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { EnumsExtrasService } from '@/modules/hr/enums-extras/enums-extras.service';
import {
  CommandTypesQueryDto,
  ContractAdditionalTypesQueryDto,
  ReasonTypesQueryDto,
} from '@/modules/hr/enums-extras/dto/enums-extras.dto';

@ApiTags('HR / Enums Extras')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/enums')
export class EnumsExtrasController {
  constructor(private readonly service: EnumsExtrasService) {}

  @Get('contract-additional-types')
  @ApiOperation({ summary: 'ContractAdditional types (subset by contract_type)' })
  contractAdditionalTypes(@Query() query: ContractAdditionalTypesQueryDto) {
    return buildSuccess(true, this.service.contractAdditionalTypes(query.contract_type));
  }

  @Get('command-types')
  @ApiOperation({ summary: 'Command types (by status + type)' })
  commandTypes(@Query() query: CommandTypesQueryDto) {
    return buildSuccess(true, this.service.commandTypes(query.status, query.type));
  }

  @Get('reason-types')
  @ApiOperation({ summary: 'Command reason types (by command type)' })
  reasonTypes(@Query() query: ReasonTypesQueryDto) {
    return buildSuccess(true, this.service.reasonTypes(query.type));
  }
}
