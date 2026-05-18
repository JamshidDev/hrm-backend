// WorkerAcademicDegree controller. Laravel: HR/WorkerAcademicDegreeController.

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
import { WorkerAcademicDegreeService } from '@/modules/hr/worker-academic-degrees/worker-academic-degree.service';
import {
  QueryWorkerAcademicDegreeDto,
  CreateWorkerAcademicDegreeDto,
  UpdateWorkerAcademicDegreeDto,
} from '@/modules/hr/worker-academic-degrees/dto/worker-academic-degree.dto';

@ApiTags('HR / Worker Academic Degrees')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-academic-degrees')
export class WorkerAcademicDegreeController {
  constructor(
    private readonly service: WorkerAcademicDegreeService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker academic degrees (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerAcademicDegreeDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateWorkerAcademicDegreeDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerAcademicDegreeDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
