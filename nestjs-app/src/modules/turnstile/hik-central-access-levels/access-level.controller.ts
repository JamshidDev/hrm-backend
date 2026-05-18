// HikCentral AccessLevel controller. Laravel: HikCentralAccessLevelController.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { AccessLevelService } from '@/modules/turnstile/hik-central-access-levels/access-level.service';
import {
  AttachAccessLevelToOrgDto,
  QueryAccessLevelDto,
  UpdateAccessLevelDto,
} from '@/modules/turnstile/hik-central-access-levels/dto/access-level.dto';

@ApiTags('Turnstile / HikCentral AccessLevels')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class AccessLevelController {
  constructor(
    private readonly service: AccessLevelService,
    private readonly i18n: I18nService,
  ) {}

  @Get('access-levels-sync')
  @ApiOperation({ summary: 'Sync access-levels from HikCentral (external)' })
  async sync() {
    await this.service.syncAccessLevels();
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Get('access-levels')
  @ApiOperation({ summary: 'List HCP access-levels' })
  async list(@Query() q: QueryAccessLevelDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('departments')
  @ApiOperation({ summary: 'HCP departments + devices ({departments, devices})' })
  async departments() {
    return buildSuccess(true, await this.service.departments());
  }

  @Put('access-levels/:id')
  @ApiOperation({ summary: 'Update access-level' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccessLevelDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Get('organization-access-levels')
  @ApiOperation({ summary: 'Access-levels attached to an organization' })
  async orgAccessLevels(@Query() q: QueryAccessLevelDto) {
    return buildSuccess(true, await this.service.organizationAccessLevels(Number(q.organization_id ?? 0)));
  }

  @Get('all-access-levels')
  @ApiOperation({ summary: 'All access-levels (flat, no pagination)' })
  async all(@Query() q: QueryAccessLevelDto) {
    return buildSuccess(true, await this.service.allAccessLevels(q));
  }

  @Post('organization-access-levels-attach')
  @ApiOperation({ summary: 'Replace org↔access-level associations' })
  async attach(@Body() dto: AttachAccessLevelToOrgDto) {
    await this.service.attachToOrganization(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }
}
