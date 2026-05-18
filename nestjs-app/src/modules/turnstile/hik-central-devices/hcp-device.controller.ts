// HCP Device controller. Laravel: HikCentralController (devices section).

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
import { HcpDeviceService } from '@/modules/turnstile/hik-central-devices/hcp-device.service';
import {
  CreateHcpDeviceDto,
  QueryHcpDeviceDto,
  UpdateHcpDeviceDto,
} from '@/modules/turnstile/hik-central-devices/dto/hcp-device.dto';

@ApiTags('Turnstile / HikCentral Devices')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class HcpDeviceController {
  constructor(
    private readonly service: HcpDeviceService,
    private readonly i18n: I18nService,
  ) {}

  @Get('devices') async list(@Query() q: QueryHcpDeviceDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('devices-stat-export') async exportStat() {
    return buildSuccess(true, this.service.exportStatistics());
  }

  @Put('devices/:deviceId') async update(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() dto: UpdateHcpDeviceDto,
  ) {
    await this.service.update(deviceId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete('devices/:deviceId') async remove(
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    await this.service.remove(deviceId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }

  @Post('devices') async store(@Body() dto: CreateHcpDeviceDto) {
    await this.service.create(dto);
    // Laravel returns successfully_updated (yes — it's a Laravel quirk).
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Get('devices-refresh') async refresh() {
    await this.service.refresh();
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }
}
