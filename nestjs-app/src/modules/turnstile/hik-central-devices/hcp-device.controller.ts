// HCP Device controller. Laravel: HikCentralController (devices section).

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { HcpDeviceService } from '@/modules/turnstile/hik-central-devices/hcp-device.service';
import {
  CreateHcpDeviceDto,
  QueryHcpDeviceDto,
  UpdateHcpDeviceDto,
} from '@/modules/turnstile/hik-central-devices/dto/hcp-device.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Turnstile / HikCentral Devices')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class HcpDeviceController {
  constructor(
    private readonly service: HcpDeviceService,
    private readonly i18n: I18nService,
  ) {}

  @Get('devices')
  @RawResponse()
  async list(
    @Query() q: QueryHcpDeviceDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Laravel: ?download=true → Excel::download(HCPDevicesExport, 'devices.xlsx').
    if (
      q.download &&
      q.download !== 'false' &&
      String(q.download).toLowerCase() !== 'no'
    ) {
      const buffer = await this.service.buildDevicesExcel(q);
      res.setHeader('Content-Type', XLSX_MIME);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="devices.xlsx"',
      );
      res.end(buffer);
      return;
    }
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('devices-stat-export')
  @RawResponse()
  async exportStat(
    @Query() q: QueryHcpDeviceDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.service.exportStatistics(q);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', 'attachment; filename="stat.xlsx"');
    res.end(buffer);
  }

  @Put('devices/:deviceId') async update(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() dto: UpdateHcpDeviceDto,
  ) {
    await this.service.update(deviceId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('devices/:deviceId') async remove(
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    await this.service.remove(deviceId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('devices') async store(@Body() dto: CreateHcpDeviceDto) {
    await this.service.create(dto);
    // Laravel returns successfully_updated (yes — it's a Laravel quirk).
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('devices-refresh') async refresh() {
    await this.service.refresh();
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
