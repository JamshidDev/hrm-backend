// WorkerPhoto controller. Laravel: HR/WorkerPhotoController (apiResource).

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerPhotoService } from '@/modules/hr/worker-photos/worker-photo.service';
import {
  CreateWorkerPhotoDto,
  QueryWorkerPhotoDto,
  UpdateWorkerPhotoDto,
} from '@/modules/hr/worker-photos/dto/worker-photo.dto';

@ApiTags('HR / Worker Photos')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-photos')
export class WorkerPhotoController {
  constructor(
    private readonly service: WorkerPhotoService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker photos (by worker_id)' })
  async findAll(@Query() query: QueryWorkerPhotoDto) {
    return buildSuccess(true, await this.service.findAll(query.worker_id));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Upload new worker photo (base64)' })
  async create(@Body() dto: CreateWorkerPhotoDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Update worker photo (re-upload + set current)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerPhotoDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Delete worker photo (non-current only)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
