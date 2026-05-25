// OrganizationTerminal controller. Laravel: OrganizationTerminalController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { OrganizationTerminalService } from '@/modules/turnstile/organization-terminals/organization-terminal.service';
import { SyncOrganizationTerminalsDto } from '@/modules/turnstile/organization-terminals/dto/organization-terminal.dto';

@ApiTags('Turnstile / Organization Terminals')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/organization-terminals')
export class OrganizationTerminalController {
  constructor(
    private readonly service: OrganizationTerminalService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organizations with terminal counts' })
  async index() {
    return buildSuccess(true, await this.service.list());
  }

  @Get(':id')
  @ApiOperation({ summary: 'List terminals attached to an organization' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Sync terminals for an organization (replace all)' })
  async store(@Body() dto: SyncOrganizationTerminalsDto) {
    await this.service.sync(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Detach all terminals from an organization' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.detachAll(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
