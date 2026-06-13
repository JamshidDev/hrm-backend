// Integration log controller. Laravel: IntegrationApiLogController.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationLogService } from '@/modules/admin/integration-log/integration-log.service';
import {
  IntegrationLogFilterDto,
  IntegrationLogTimelineDto,
  IntegrationLogTopDto,
  UpdateHmacUserDto,
} from '@/modules/admin/integration-log/dto/integration-log.dto';

@ApiTags('Admin / Integration Log')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/integration-log')
export class IntegrationLogController {
  constructor(
    private readonly service: IntegrationLogService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List integration API logs (paginated + filters)' })
  async list(@Query() q: IntegrationLogFilterDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('users')
  @ApiOperation({ summary: 'List HmacUser clients' })
  async users() {
    return buildSuccess(true, await this.service.users());
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Summary stats (totals, avg duration, unique clients)',
  })
  async summary(@Query() q: IntegrationLogFilterDto) {
    return buildSuccess(true, await this.service.summary(q));
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Timeline grouped by day or hour' })
  async timeline(@Query() q: IntegrationLogTimelineDto) {
    return buildSuccess(true, await this.service.timeline(q));
  }

  @Get('top-clients')
  @ApiOperation({ summary: 'Top clients by request count' })
  async topClients(@Query() q: IntegrationLogTopDto) {
    return buildSuccess(true, await this.service.topClients(q));
  }

  @Get('top-endpoints')
  @ApiOperation({ summary: 'Top endpoints by request count' })
  async topEndpoints(@Query() q: IntegrationLogTopDto) {
    return buildSuccess(true, await this.service.topEndpoints(q));
  }

  @Get('methods')
  @ApiOperation({ summary: 'Count by HTTP method' })
  async methods(@Query() q: IntegrationLogFilterDto) {
    return buildSuccess(true, await this.service.methods(q));
  }

  @Get('statuses')
  @ApiOperation({ summary: 'Count by response status' })
  async statuses(@Query() q: IntegrationLogFilterDto) {
    return buildSuccess(true, await this.service.statuses(q));
  }

  @Put('users/:id')
  @ApiOperation({
    summary: 'Update HmacUser (is_active, name, public_key, etc.)',
  })
  async updateHmacUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHmacUserDto,
  ) {
    await this.service.updateHmacUser(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
