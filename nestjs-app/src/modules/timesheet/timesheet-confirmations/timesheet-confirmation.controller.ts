// Timesheet confirmations controller. Laravel: TimeSheetController::{attachConfirmations,getConfirmations,reattach}.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TimesheetConfirmationService } from '@/modules/timesheet/timesheet-confirmations/timesheet-confirmation.service';
import { AttachConfirmationsDto } from '@/modules/timesheet/timesheet-confirmations/dto/timesheet-confirmation.dto';

@ApiTags('TimeSheet / Confirmations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/timesheet')
export class TimesheetConfirmationController {
  constructor(
    private readonly service: TimesheetConfirmationService,
    private readonly i18n: I18nService,
  ) {}

  @Post(':id/confirmations')
  @ApiOperation({ summary: 'Attach confirmations to timesheet' })
  async attach(
    @Param('id', ParseIntPipe) timesheetId: number,
    @Body() dto: AttachConfirmationsDto,
  ) {
    await this.service.attach(timesheetId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get(':id/confirmations')
  @ApiOperation({ summary: 'List confirmations of a timesheet' })
  async list(@Param('id', ParseIntPipe) timesheetId: number) {
    return buildSuccess(true, await this.service.list(timesheetId));
  }

  @Delete(':id/confirmations/:confirmationId')
  @ApiOperation({ summary: 'Detach (soft-delete) a confirmation' })
  async detach(
    @Param('id', ParseIntPipe) timesheetId: number,
    @Param('confirmationId', ParseIntPipe) confirmationId: number,
  ) {
    await this.service.detach(timesheetId, confirmationId);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
