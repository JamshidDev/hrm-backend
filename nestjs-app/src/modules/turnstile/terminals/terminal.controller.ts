// Terminal controller. Laravel: Turnstile/TerminalController.

import {
  Body,
  Controller,
  Delete,
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
import { TerminalService } from '@/modules/turnstile/terminals/terminal.service';
import {
  CreateTerminalDto,
  QueryTerminalDto,
  UpdateTerminalDto,
} from '@/modules/turnstile/terminals/dto/terminal.dto';

@ApiTags('Turnstile / Terminals')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/terminals')
export class TerminalController {
  constructor(
    private readonly service: TerminalService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List terminals (with building)' })
  async index(@Query() q: QueryTerminalDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post()
  @ApiOperation({ summary: 'Create terminal' })
  async store(@Body() dto: CreateTerminalDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update terminal' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTerminalDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete terminal (soft-delete)' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
