// Integration contracts controller.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { IntegrationHmacGuard } from '@/common/guards/integration-hmac.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationContractService } from '@/modules/integration/contracts/contract.service';
import { IntegrationPageQueryDto } from '@/modules/integration/_shared/page-query.dto';

@ApiTags('Integration / Contracts')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard, IntegrationHmacGuard)
@Permission('integration')
@Controller('api/v1/integration')
export class IntegrationContractController {
  constructor(private readonly service: IntegrationContractService) {}

  @Get('contracts')
  @ApiOperation({ summary: 'List contracts (paginated)' })
  async listContracts(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.listContracts(q));
  }

  @Get('classifications/positions')
  @ApiOperation({ summary: 'Classification positions (paginated)' })
  async classificationPositions(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.classificationPositions(q));
  }
}
