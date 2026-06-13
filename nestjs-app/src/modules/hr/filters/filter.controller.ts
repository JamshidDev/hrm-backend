// Filter controller. Laravel: HR/FilterController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { FilterService } from '@/modules/hr/filters/filter.service';
import {
  FilterDepartmentPositionsQueryDto,
  FilterDepartmentsByOrgsQueryDto,
  FilterDepartmentsTreeQueryDto,
  FilterPositionsQueryDto,
  FilterRootDepartmentsQueryDto,
  FilterSearchWorkersQueryDto,
} from '@/modules/hr/filters/dto/filter.dto';

@ApiTags('HR / Filters')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class FilterController {
  constructor(private readonly service: FilterService) {}

  @Get('get-department-positions')
  @UseGuards(PermissionGuard)
  @Permission('filter')
  @ApiOperation({ summary: 'Department positions by department_id' })
  async getDepartmentPositions(
    @Query() query: FilterDepartmentPositionsQueryDto,
  ) {
    return buildSuccess(
      true,
      await this.service.departmentPositions(query.department_id),
    );
  }

  @Get('get-departments-tree')
  @UseGuards(PermissionGuard)
  @Permission('filter')
  @ApiOperation({ summary: 'Departments tree (flat → nested by parent_id)' })
  async getDepartmentsTree(@Query() query: FilterDepartmentsTreeQueryDto) {
    return buildSuccess(true, await this.service.departmentTree(query));
  }

  @Get('get-departments')
  @UseGuards(PermissionGuard)
  @Permission('filter')
  @ApiOperation({ summary: 'Departments paginated by organizations' })
  async getDepartments(@Query() query: FilterDepartmentsByOrgsQueryDto) {
    return this.service.departmentsByOrganizations(query);
  }

  @Get('get-department')
  @UseGuards(PermissionGuard)
  @Permission('filter')
  @ApiOperation({ summary: 'Root departments (whereIsRoot)' })
  async getDepartment(@Query() query: FilterRootDepartmentsQueryDto) {
    return buildSuccess(true, await this.service.rootDepartments(query));
  }

  @Get('get-positions')
  @UseGuards(PermissionGuard)
  @Permission('filter')
  @ApiOperation({
    summary: 'Active positions (filter by organizations/departments)',
  })
  async getPositions(@Query() query: FilterPositionsQueryDto) {
    return buildSuccess(true, await this.service.positions(query));
  }

  @Get('search-workers')
  @UseGuards(PermissionGuard)
  @Permission('filter-search-workers')
  @ApiOperation({ summary: 'Search workers within an organization' })
  async searchWorkers(@Query() query: FilterSearchWorkersQueryDto) {
    return buildSuccess(true, await this.service.searchWorkers(query));
  }
}
