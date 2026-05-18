// WorkerApplication controller (HR routes only — index/accept/generate-url).
// Laravel: HR/WorkerApplicationController.

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerApplicationService } from '@/modules/hr/worker-applications/worker-application.service';
import {
  AcceptWorkerApplicationDto,
  GenerateApplicationUrlDto,
  QueryWorkerApplicationDto,
} from '@/modules/hr/worker-applications/dto/worker-application.dto';

@ApiTags('HR / Worker Applications')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/applications')
export class WorkerApplicationController {
  constructor(
    private readonly service: WorkerApplicationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker applications list (worker_id IS NOT NULL)' })
  async findAll(@Query() query: QueryWorkerApplicationDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Put(':id/accept')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Accept/reject application (status + optional comment)' })
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcceptWorkerApplicationDto,
  ) {
    await this.service.accept(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Post('generate-url')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Generate signed URL for worker application' })
  async generateUrl(@Body() dto: GenerateApplicationUrlDto) {
    return buildSuccess(true, await this.service.generateUrl(dto));
  }
}
