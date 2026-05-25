// Worker Turnstile Approve controller. Laravel: WorkerTurnstileApproveController.

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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ApproveAlService } from '@/modules/turnstile/hik-central-approve-al/approve-al.service';

@ApiTags('Turnstile / HikCentral Approve-AL')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class ApproveAlController {
  constructor(
    private readonly service: ApproveAlService,
    private readonly i18n: I18nService,
  ) {}

  @Get('approve-al/als') async accessLevels(@Query() q: any) {
    return buildSuccess(true, await this.service.accessLevels(q));
  }

  @Get('approve-al/list') async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('approve-al/list/:id') async show(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('approve-al/list') async store(@Body() body: any) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('approve-al/list/:id') async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('approve-al/list/:id') async destroy(
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(id);
    // Laravel returns 'successfully_updated' for destroy (intentional in Laravel code).
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Post('approve-al/approved/:approvalId') async approve(
    @Param('approvalId', ParseIntPipe) approvalId: number,
    @Body() body: any,
  ) {
    await this.service.approve(approvalId, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
