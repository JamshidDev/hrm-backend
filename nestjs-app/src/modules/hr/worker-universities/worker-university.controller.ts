// WorkerUniversity controller. Laravel: HR/WorkerUniversityController.

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
import { WorkerUniversityService } from '@/modules/hr/worker-universities/worker-university.service';
import {
  QueryWorkerUniversityDto,
  CreateWorkerUniversityDto,
  UpdateWorkerUniversityDto,
} from '@/modules/hr/worker-universities/dto/worker-university.dto';

@ApiTags('HR / Worker Universities')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-universities')
export class WorkerUniversityController {
  constructor(
    private readonly service: WorkerUniversityService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Worker universities (by worker uuid, paginated, sort DESC)',
  })
  async findAll(@Query() query: QueryWorkerUniversityDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create worker university (optional diploma file)' })
  async create(
    @Body() dto: CreateWorkerUniversityDto,
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
  @ApiOperation({ summary: 'Update worker university' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerUniversityDto,
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
