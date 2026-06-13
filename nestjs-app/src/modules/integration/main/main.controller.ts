// Integration main controller.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationMainService } from '@/modules/integration/main/main.service';
import {
  IntegrationDateQueryDto,
  IntegrationPageQueryDto,
  IntegrationStructureQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

@ApiTags('Integration')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('integration')
@Controller('api/v1/integration')
export class IntegrationMainController {
  constructor(private readonly service: IntegrationMainService) {}

  @Get('enums')
  @ApiOperation({ summary: 'Integration enums (genders, contract_types)' })
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard counts (workers, departments, organizations)',
  })
  async dashboard(@Query() _q: IntegrationDateQueryDto) {
    return buildSuccess(true, await this.service.dashboard());
  }

  @Get('structure')
  @ApiOperation({ summary: 'Structure (role-based org tree)' })
  async structure(@Query() q: IntegrationStructureQueryDto) {
    return buildSuccess(true, await this.service.structure(q));
  }

  @Get('structure/:organizationId/leaders')
  @ApiOperation({ summary: 'Organization leaders' })
  async leaders(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return buildSuccess(true, await this.service.leaders(organizationId));
  }

  @Get('departments')
  @ApiOperation({ summary: 'List departments (paginated)' })
  async departments(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.listDepartments(q));
  }

  @Get('positions')
  @ApiOperation({ summary: 'List positions (paginated)' })
  async positions(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.listPositions(q));
  }

  @Get('get-departments')
  @ApiOperation({ summary: 'Departments brief (id, name)' })
  async getDepartmentsAll() {
    return buildSuccess(true, await this.service.getDepartmentsAll());
  }

  @Get('get-positions')
  @ApiOperation({ summary: 'Positions paginated (filter endpoint)' })
  async getPositions(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.getPositions(q));
  }

  @Get('kpi/report')
  @ApiOperation({ summary: 'KPI report' })
  async kpiReport() {
    return buildSuccess(true, await this.service.kpiReport());
  }
}
