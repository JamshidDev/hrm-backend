// HikCentral Sync controller. Laravel: HikCentralSyncController.

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
import { buildSuccess } from '@/common/utils/response.util';
import { SyncService } from '@/modules/turnstile/hik-central-sync/sync.service';

@ApiTags('Turnstile / HikCentral Sync')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class SyncController {
  constructor(private readonly service: SyncService) {}

  @Get('sync')
  @ApiOperation({ summary: 'List HCP sync access-log entries' })
  async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('sync/:syncId')
  @ApiOperation({ summary: 'Show sync events grouped by device' })
  async show(@Param('syncId', ParseIntPipe) syncId: number) {
    return buildSuccess(true, await this.service.show(syncId));
  }

  @Get('sync/:syncId/offline-devices')
  @ApiOperation({ summary: 'Offline devices snapshot for a sync run' })
  async offlineDevices(@Param('syncId', ParseIntPipe) syncId: number) {
    return buildSuccess(true, await this.service.offlineDevices(syncId));
  }
}
