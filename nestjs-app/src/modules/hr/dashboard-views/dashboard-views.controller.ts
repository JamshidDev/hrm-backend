// HR Dashboard Views controller. Laravel: HR/Dashboard/DashboardViewController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DashboardViewsService } from '@/modules/hr/dashboard-views/dashboard-views.service';
import {
  BirthdaysQueryDto,
  ContractsQueryDto,
  DashboardYearQueryDto,
  DisabilityPreviewQueryDto,
  SickLeavePreviewQueryDto,
  WorkerByAgeQueryDto,
  WorkerByContractTypeQueryDto,
  WorkerByMedQueryDto,
  WorkerByPassportQueryDto,
  WorkerByPensionQueryDto,
  WorkersByEducationQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

@ApiTags('HR / Dashboard Views')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/dashboard')
export class DashboardViewsController {
  constructor(private readonly service: DashboardViewsService) {}

  @Get('birthdays')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers with birthday on specific day/month' })
  async birthdays(@Query() q: BirthdaysQueryDto) {
    return buildSuccess(true, await this.service.birthdays(q));
  }

  @Get('educations')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers grouped by education' })
  async educations(@Query() q: WorkersByEducationQueryDto) {
    return buildSuccess(true, await this.service.workersByEducation(q));
  }

  @Get('age')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers by age range' })
  async age(@Query() q: WorkerByAgeQueryDto) {
    return buildSuccess(true, await this.service.workerByAge(q));
  }

  @Get('passport')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers by passport status' })
  async passport(@Query() q: WorkerByPassportQueryDto) {
    return buildSuccess(true, await this.service.workerByPassport(q));
  }

  @Get('pension')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers eligible for pension' })
  async pension(@Query() q: WorkerByPensionQueryDto) {
    return buildSuccess(true, await this.service.workerByPension(q));
  }

  @Get('meds')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers by latest med status' })
  async meds(@Query() q: WorkerByMedQueryDto) {
    return buildSuccess(true, await this.service.workerByMed(q));
  }

  @Get('worker-disabilities/preview')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Worker disabilities preview' })
  async disabilitiesPreview(@Query() q: DisabilityPreviewQueryDto) {
    return buildSuccess(true, await this.service.workerDisabilitiesPreview(q));
  }

  @Get('worker-relative-disabilities/preview')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Worker relative disabilities preview' })
  async relativeDisabilitiesPreview(@Query() q: DisabilityPreviewQueryDto) {
    return buildSuccess(true, await this.service.workerRelativeDisabilitiesPreview(q));
  }

  @Get('worker-sick-leaves/preview')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Worker sick leaves preview' })
  async sickLeavesPreview(@Query() q: SickLeavePreviewQueryDto) {
    return buildSuccess(true, await this.service.workerSickLeavesPreview(q));
  }

  @Get('disciplinary-actions')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Disciplinary actions in year' })
  async disciplinary(@Query() q: DashboardYearQueryDto) {
    return buildSuccess(true, await this.service.disciplinaryActions(q));
  }

  @Get('incentive-actions')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Incentive actions in year' })
  async incentive(@Query() q: DashboardYearQueryDto) {
    return buildSuccess(true, await this.service.incentiveActions(q));
  }

  @Get('contract-types')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'Workers by contract type' })
  async contractTypes(@Query() q: WorkerByContractTypeQueryDto) {
    return buildSuccess(true, await this.service.workerByContractTypes(q));
  }

  @Get('contracts')
  @UseGuards(PermissionGuard) @Permission('hr-dashboard-read')
  @ApiOperation({ summary: 'New or ended contracts by month' })
  async contracts(@Query() q: ContractsQueryDto) {
    return buildSuccess(true, await this.service.contracts(q));
  }
}
