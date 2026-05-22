// Incentive controller. Laravel: HR/OrganizationIncentiveController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { IncentiveService } from '@/modules/hr/incentives/incentive.service';
import {
  IncentiveListResponseDto,
  QueryIncentiveDto,
} from '@/modules/hr/incentives/dto/incentive.dto';

@ApiTags('HR / Incentives')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/incentives')
export class IncentiveController {
  constructor(
    private readonly service: IncentiveService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Incentives list; download=true → Excel export task',
  })
  @ApiOkResponse({ type: IncentiveListResponseDto })
  async findAll(@Query() query: QueryIncentiveDto) {
    // download=true — Laravel: UserExportTask + IncentiveExportToExcelJob.
    if (query.download) {
      await this.service.exportToTask(query);
      return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
    }
    return this.service.findAll(query);
  }
}
