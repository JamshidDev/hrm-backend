// Integration meds controller.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { IntegrationHmacGuard } from '@/common/guards/integration-hmac.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationMedService } from '@/modules/integration/meds/med.service';
import { IntegrationPageQueryDto } from '@/modules/integration/_shared/page-query.dto';

@ApiTags('Integration / Meds')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard, IntegrationHmacGuard)
@Permission('integration')
@Controller('api/v1/integration')
export class IntegrationMedController {
  constructor(private readonly service: IntegrationMedService) {}

  @Get('meds')
  @ApiOperation({ summary: 'List medical records (paginated)' })
  async list(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('workers/:id/meds')
  @ApiOperation({ summary: 'Medical records of a specific worker' })
  async byWorker(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: IntegrationPageQueryDto,
  ) {
    return buildSuccess(true, await this.service.byWorker(id, q));
  }
}
