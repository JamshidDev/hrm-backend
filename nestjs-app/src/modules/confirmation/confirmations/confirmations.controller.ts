// Confirmation lists controller.
// Laravel: Confirmation/{Contract,Command,...}ConfirmationController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ConfirmationsService } from '@/modules/confirmation/confirmations/confirmations.service';
import { QueryConfirmationDto } from '@/modules/confirmation/confirmations/dto/confirmation.dto';

@ApiTags('Confirmation / Lists')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/confirmation')
export class ConfirmationsController {
  constructor(private readonly service: ConfirmationsService) {}

  @Get('contracts')
  @ApiOperation({ summary: 'Pending contract confirmations' })
  async contracts(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.contracts(query));
  }

  @Get('commands')
  @ApiOperation({ summary: 'Pending command confirmations' })
  async commands(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.commands(query));
  }

  @Get('contract-additional')
  @ApiOperation({ summary: 'Pending contract-additional confirmations' })
  async contractAdditional(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.contractAdditional(query));
  }

  @Get('timesheet')
  @ApiOperation({ summary: 'Pending timesheet confirmations' })
  async timesheet(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.timesheet(query));
  }

  @Get('vacation-schedule')
  @ApiOperation({ summary: 'Pending vacation-schedule confirmations' })
  async vacationSchedule(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.vacationSchedule(query));
  }

  @Get('protocol')
  @ApiOperation({ summary: 'LMS protocol confirmations' })
  async protocol(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.lmsProtocol(query));
  }

  @Get('certificates')
  @ApiOperation({ summary: 'LMS certificate confirmations' })
  async certificates(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.lmsCertificate(query));
  }

  @Get('staffing-approve')
  @ApiOperation({ summary: 'Staffing approve confirmations' })
  async staffingApprove(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.staffingApprove(query));
  }

  @Get('reports')
  @ApiOperation({ summary: 'Report confirmations' })
  async reports(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.reports(query));
  }

  @Get('applications')
  @ApiOperation({ summary: 'Worker application confirmations' })
  async applications(@Query() query: QueryConfirmationDto) {
    return buildSuccess(true, await this.service.workerApplications(query));
  }
}
