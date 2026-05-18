// DepartmentLocation controller. Laravel: HR/DepartmentLocationController.

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
import { DepartmentLocationService } from '@/modules/hr/department-locations/department-location.service';
import {
  CreateDepartmentLocationDto,
  QueryDepartmentLocationDto,
  UpdateDepartmentLocationDto,
} from '@/modules/hr/department-locations/dto/department-location.dto';

@ApiTags('HR / Department Locations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/extra/department/locations')
export class DepartmentLocationController {
  constructor(
    private readonly service: DepartmentLocationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  async findAll(@Query() query: QueryDepartmentLocationDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Get(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr-departments-write')
  async create(@Body() dto: CreateDepartmentLocationDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr-departments-write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentLocationDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr-departments-write')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Laravel: GET /api/v1/hr/list — DepartmentLocationController::list.
@ApiTags('HR / Department Locations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/extra/department')
export class DepartmentLocationListController {
  constructor(private readonly service: DepartmentLocationService) {}

  @Get('list')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Department locations short list' })
  async list() {
    return buildSuccess(true, await this.service.list());
  }
}
