// Sended worker controller. Laravel: Med/MedController (sendToMed, sendedWorkers, destroy).

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
import { SendedWorkerService } from '@/modules/med/sended-workers/sended-worker.service';
import {
  QuerySendedWorkerDto,
  SendToMedDto,
} from '@/modules/med/sended-workers/dto/sended-worker.dto';

@ApiTags('Med / Sended Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/med')
export class SendedWorkerController {
  constructor(
    private readonly service: SendedWorkerService,
    private readonly i18n: I18nService,
  ) {}

  @Post('send-to-med')
  @ApiOperation({ summary: 'Send a worker to a polyclinic for medical check' })
  async sendToMed(@Body() dto: SendToMedDto) {
    await this.service.sendToMed(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }

  @Get('sended-workers')
  @ApiOperation({ summary: 'List workers sent for medical check' })
  async list(@Query() query: QuerySendedWorkerDto) {
    return buildSuccess(true, await this.service.list(query));
  }

  @Delete('sended-workers/:id')
  @ApiOperation({ summary: 'Soft-delete a sended worker record' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }
}
