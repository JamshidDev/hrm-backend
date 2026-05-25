// WorkerAcademicTitle controller. Laravel: HR/WorkerAcademicTitleController.

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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerAcademicTitleService } from '@/modules/hr/worker-academic-titles/worker-academic-title.service';
import {
  QueryWorkerAcademicTitleDto,
  CreateWorkerAcademicTitleDto,
  UpdateWorkerAcademicTitleDto,
} from '@/modules/hr/worker-academic-titles/dto/worker-academic-title.dto';

@ApiTags('HR / Worker Academic Titles')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-academic-titles')
export class WorkerAcademicTitleController {
  constructor(
    private readonly service: WorkerAcademicTitleService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker academic titles (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerAcademicTitleDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Create worker academic title (optional certificate)',
  })
  async create(
    @Body() dto: CreateWorkerAcademicTitleDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.create(dto, file);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update worker academic title' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerAcademicTitleDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(id, dto, file);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
