// Application confirmation controller. Laravel: POST v1/document/application-confirmation
// (public, signed URL). Route name: document.signature.application.generate-url.

import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ApplicationConfirmationService } from '@/modules/confirmation/application-confirmation/application-confirmation.service';
import { ApplicationConfirmationDto } from '@/modules/confirmation/application-confirmation/dto/application-confirmation.dto';

@ApiTags('Confirmation / Application Signature')
@Controller('api/v1/document')
export class ApplicationConfirmationController {
  constructor(
    private readonly service: ApplicationConfirmationService,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: Helper::response(trans('messages.successfully_stored'), $result).
  @Post('application-confirmation')
  @Public()
  @ApiOperation({ summary: 'Confirm worker application by E-IMZO signature' })
  async applicationConfirmation(
    @Body() dto: ApplicationConfirmationDto,
    @Req() req: Request,
  ) {
    // signed-URL imzosini tekshirish uchun original query string (signature'siz).
    const qIndex = req.originalUrl.indexOf('?');
    const fullQuery = qIndex >= 0 ? req.originalUrl.slice(qIndex + 1) : '';
    const rawQuery = fullQuery
      .split('&')
      .filter((p) => p && !p.startsWith('signature='))
      .join('&');

    const result = await this.service.confirmBySignature(dto, {
      path: '/api/v1/document/application-confirmation',
      query: req.query as Record<string, string | undefined>,
      rawQuery,
    });
    return buildSuccess(this.i18n.t('messages.successfully_stored'), result);
  }
}
