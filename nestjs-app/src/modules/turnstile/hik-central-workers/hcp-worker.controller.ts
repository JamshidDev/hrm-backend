// HCP Worker controller. Laravel: HikCentralWorkerController + HikCentralController
// (workers section) + TurnstileController (addedLogs, invalidWorkers).

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { HcpWorkerService } from '@/modules/turnstile/hik-central-workers/hcp-worker.service';
import {
  AddHcpWorkerDto,
  QueryHcpWorkerDto,
  SyncWorkersToHcpDto,
} from '@/modules/turnstile/hik-central-workers/dto/hcp-worker.dto';

@ApiTags('Turnstile / HikCentral Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class HcpWorkerController {
  constructor(
    private readonly service: HcpWorkerService,
    private readonly i18n: I18nService,
  ) {}

  @Get('groups') async groups() {
    return buildSuccess(true, await this.service.groups());
  }

  @Get('workers') async list(@Query() q: QueryHcpWorkerDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('worker-access-levels') async showAccessLevels(@Query() q: any) {
    return buildSuccess(true, await this.service.showAccessLevels(q));
  }

  @Get('worker-errors') async showErrorAL(@Query() q: QueryHcpWorkerDto) {
    return buildSuccess(true, await this.service.showErrorAL(q));
  }

  @Delete('workers/destroy/:workerId') async destroy(
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    await this.service.destroy(workerId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('workers/add') async add(@Body() dto: AddHcpWorkerDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.addWorker(dto),
    );
  }

  @Post('workers/update-face') async updateFace(@Body() _body: any) {
    await this.service.updateFace();
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Post('workers/refresh') async refreshAccessLevel(
    @Body() body: { access_level_id?: number },
  ) {
    await this.service.refreshAccessLevel(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('workers/access-levels') async accessLevels(
    @Query() q: { organization_id?: number },
  ) {
    return buildSuccess(true, await this.service.accessLevels(q));
  }

  @Post('workers/sync-to-server') async syncToServer(
    @Body() dto: SyncWorkersToHcpDto,
  ) {
    await this.service.syncWorkersToHikCentral(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get('workers/exported-jobs') async exportedJobs(
    @Query() q: QueryHcpWorkerDto,
  ) {
    return buildSuccess(true, await this.service.jobs(q));
  }

  @Get('workers/exported-errors') async exportedErrors(
    @Query() q: QueryHcpWorkerDto,
  ) {
    return buildSuccess(true, await this.service.errorWorkers(q));
  }

  @Get('workers/added-logs') async addedLogs(@Query() q: QueryHcpWorkerDto) {
    return buildSuccess(true, await this.service.addedLogs(q));
  }

  @Get('workers/invalids') async invalidWorkers() {
    return buildSuccess(true, await this.service.invalidWorkersByHcp());
  }
}
