// Report controller. Laravel: HR/ReportController (8 endpoints).

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ReportService } from '@/modules/hr/reports/report.service';
import {
  ReportDepartmentPositionsQueryDto,
  ReportDepartmentsQueryDto,
  ReportOptimizationQueryDto,
  ReportOrderableDto,
  ReportStructureQueryDto,
  ReportWorkerPositionsQueryDto,
} from '@/modules/hr/reports/dto/report.dto';

@ApiTags('HR / Reports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/report')
export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly i18n: I18nService,
  ) {}

  @Get('structure')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Organization structure (tree)' })
  async structure(@Query() query: ReportStructureQueryDto) {
    return buildSuccess(true, await this.service.structure(query));
  }

  @Get('departments')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Departments tree (by organization)' })
  async departments(@Query() query: ReportDepartmentsQueryDto) {
    return buildSuccess(true, await this.service.departments(query));
  }

  @Delete('departments/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Delete department (soft)' })
  async deleteDepartment(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteDepartment(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('department-positions')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Department positions paginated' })
  async departmentPositions(@Query() query: ReportDepartmentPositionsQueryDto) {
    return buildSuccess(true, await this.service.departmentPositions(query));
  }

  @Delete('department-positions/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Delete department-position (soft)' })
  async deletePosition(@Param('id', ParseIntPipe) id: number) {
    await this.service.deletePosition(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('worker-positions')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Worker positions for report' })
  async workerPositions(@Query() query: ReportWorkerPositionsQueryDto) {
    return buildSuccess(true, await this.service.workerPositions(query));
  }

  @Get('optimization')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Merge duplicate department-positions' })
  async optimization(@Query() query: ReportOptimizationQueryDto) {
    await this.service.optimization(query);
    // Laravel: trans('messages.successfully_optimizated') — bu kalit Laravel lang
    // fayllarida YO'Q → Laravel xom kalitni qaytaradi (parity uchun shunday).
    return buildSuccess('messages.successfully_optimizated', []);
  }

  @Post('orderable')
  @UseGuards(PermissionGuard)
  @Permission('hr-report')
  @ApiOperation({ summary: 'Bulk sort departments or positions' })
  async orderable(@Body() dto: ReportOrderableDto) {
    await this.service.orderable(dto);
    return buildSuccess(this.i18n.t('messages.successfully_sorted'), []);
  }
}
