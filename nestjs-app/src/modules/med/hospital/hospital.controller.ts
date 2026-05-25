// Hospital controller. Laravel: Med/SendedWorkerController.

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
import { buildSuccess } from '@/common/utils/response.util';
import { HospitalService } from '@/modules/med/hospital/hospital.service';
import {
  AttachCommissionDto,
  ConfirmDocumentDto,
  QueryHospitalTicketsDto,
} from '@/modules/med/hospital/dto/hospital.dto';

@ApiTags('Med / Hospital')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/med/hospital')
export class HospitalController {
  constructor(
    private readonly service: HospitalService,
    private readonly i18n: I18nService,
  ) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List hospital tickets (sended workers)' })
  async tickets(@Query() query: QueryHospitalTicketsDto) {
    return buildSuccess(true, await this.service.tickets(query));
  }

  @Get('tickets/:id/commissions')
  @ApiOperation({ summary: 'List commissions attached to a ticket' })
  async commissions(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.commissions(id));
  }

  @Post('tickets-attach')
  @ApiOperation({ summary: 'Attach a commission to a ticket' })
  async attachCommission(@Body() dto: AttachCommissionDto) {
    await this.service.attachCommission(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete('tickets-attach/:id')
  @ApiOperation({ summary: 'Detach a commission from a ticket' })
  async detachCommission(@Param('id', ParseIntPipe) id: number) {
    await this.service.detachCommission(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('tickets/:id/confirm')
  @ApiOperation({ summary: 'Confirm a ticket document' })
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmDocumentDto,
  ) {
    await this.service.confirm(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
