// Worker photos controller. Laravel: WorkerTerminalController->photos.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerPhotoService } from '@/modules/turnstile/worker-photos/worker-photo.service';

@ApiTags('Turnstile / Worker Photos')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/worker-photos')
export class WorkerPhotoController {
  constructor(private readonly service: WorkerPhotoService) {}

  @Get()
  @ApiOperation({ summary: 'List worker HCP photo records' })
  async index(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }
}
