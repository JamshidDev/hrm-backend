// DepartmentPosition controller. Laravel: HR/DepartmentPositionController.
//
// Routes (apiResource-ga o'xshash, ammo bu Laravel'da `Route::resource` — show ham bor):
//   GET    /api/v1/hr/department-positions
//   GET    /api/v1/hr/department-positions/{id}
//   POST   /api/v1/hr/department-positions
//   PUT    /api/v1/hr/department-positions/{id}
//   DELETE /api/v1/hr/department-positions/{id}

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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DepartmentPositionService } from '@/modules/hr/department-positions/department-position.service';
import {
  QueryDepartmentPositionDto,
  CreateDepartmentPositionDto,
  UpdateDepartmentPositionDto,
  DepartmentPositionListResponseDto,
  DepartmentPositionShowDto,
} from '@/modules/hr/department-positions/dto/department-position.dto';

@ApiTags('HR / Department Positions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/department-positions')
export class DepartmentPositionController {
  constructor(
    private readonly service: DepartmentPositionService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department positions list (with joins)' })
  @ApiOkResponse({ type: DepartmentPositionListResponseDto })
  async findAll(@Query() query: QueryDepartmentPositionDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department position detail' })
  @ApiOkResponse({ type: DepartmentPositionShowDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.findOne(id);
    return buildSuccess(true, data);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Create department position' })
  @ApiOkResponse()
  async create(@Body() dto: CreateDepartmentPositionDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Update department position' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentPositionDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Delete department position (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
