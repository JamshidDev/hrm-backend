// Department controller. Laravel: HR/DepartmentController.
//
// Route shapes (parity):
//   GET    /api/v1/hr/departments
//   POST   /api/v1/hr/departments
//   GET    /api/v1/hr/departments/{id}
//   PUT    /api/v1/hr/departments/{id}
//   DELETE /api/v1/hr/departments/{id}
//   GET    /api/v1/hr/department-levels
//   GET    /api/v1/hr/department-list
//   GET    /api/v1/hr/departments-tree
//
// `departments` CRUD ostida `permission:hr` middleware; level/list/tree ham xuddi shu.

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
import { DepartmentService } from '@/modules/hr/departments/department.service';
import {
  QueryDepartmentDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentListResponseDto,
  DepartmentListMinResponseDto,
  DepartmentShowResponseDto,
  DepartmentTreeNodeDto,
  DepartmentLevelDto,
} from '@/modules/hr/departments/dto/department.dto';

@ApiTags('HR / Departments')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class DepartmentController {
  constructor(
    private readonly service: DepartmentService,
    private readonly i18n: I18nService,
  ) {}

  // ---------- CRUD (departments) — permission:hr ----------

  @Get('departments')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Departments list (with organization join)' })
  @ApiOkResponse({ type: DepartmentListResponseDto })
  async findAll(@Query() query: QueryDepartmentDto) {
    return this.service.findAll(query);
  }

  @Get('departments/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department show (+ children)' })
  @ApiOkResponse({ type: DepartmentShowResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('departments')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Create department' })
  @ApiOkResponse()
  async create(@Body() dto: CreateDepartmentDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('departments/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Update department' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('departments/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Delete department (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // ---------- Extras (department-levels, department-list, departments-tree) ----------

  @Get('department-levels')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department level enum (i18n)' })
  @ApiOkResponse({ type: [DepartmentLevelDto] })
  levels() {
    // Laravel: Helper::response(true, DepartmentLevelEnum::list())
    return buildSuccess(true, this.service.levels());
  }

  @Get('department-list')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department list (minimal id+name)' })
  @ApiOkResponse({ type: DepartmentListMinResponseDto })
  async findList(@Query() query: QueryDepartmentDto) {
    return this.service.findList(query);
  }

  @Get('departments-tree')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Department tree (recursive, by organization)' })
  @ApiOkResponse({ type: [DepartmentTreeNodeDto] })
  async tree(@Query() query: QueryDepartmentDto) {
    // Laravel: Helper::response(true, DepartmentTreeResource::collection($tree)).
    const data = await this.service.tree(query);
    return buildSuccess(true, data);
  }
}
