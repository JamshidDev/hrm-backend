// WorkerPassport controller. Laravel: HR/WorkerPassportController.

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
import { WorkerPassportService } from '@/modules/hr/worker-passports/worker-passport.service';
import {
  QueryWorkerPassportDto,
  CreateWorkerPassportDto,
  UpdateWorkerPassportDto,
} from '@/modules/hr/worker-passports/dto/worker-passport.dto';

@ApiTags('HR / Worker Passports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-passports')
export class WorkerPassportController {
  constructor(
    private readonly service: WorkerPassportService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker passports (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerPassportDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create worker passport (with optional PDF/image)' })
  async create(
    @Body() dto: CreateWorkerPassportDto,
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
  @ApiOperation({ summary: 'Update worker passport' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerPassportDto,
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
