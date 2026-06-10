// Document controller. Laravel: Confirmation/DocumentController + DocumentConfirmationController.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Public } from '@/common/decorators/public.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DocumentService } from '@/modules/confirmation/documents/document.service';
import {
  DocumentBase64QueryDto,
  DocumentConfirmDto,
  DocumentQueryDto,
  DocumentSignatureDto,
  DocumentSignTokenDto,
  DocumentUpdateDto,
  DocumentUpdateQueryDto,
  ForwardConfirmationDto,
  GenerateConfirmationUrlDto,
} from '@/modules/confirmation/documents/dto/document.dto';

// /v1/confirmation prefix endpoints.
@ApiTags('Confirmation / Document')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/confirmation')
export class DocumentConfirmationController {
  constructor(
    private readonly service: DocumentService,
    private readonly i18n: I18nService,
  ) {}

  @Get('document/base64')
  async documentBase64(@Query() query: DocumentBase64QueryDto) {
    return buildSuccess(true, await this.service.documentBase64(query));
  }

  @Post('document/signature')
  async signature(@Body() dto: DocumentSignatureDto) {
    const result = await this.service.signature(dto);
    return buildSuccess(result.message, []);
  }

  @Post('forward')
  async forward(@Body() dto: ForwardConfirmationDto) {
    await this.service.forwardConfirmation(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}

// /v1/document prefix endpoints.
@ApiTags('Confirmation / Document')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/document')
export class DocumentController {
  constructor(
    private readonly service: DocumentService,
    private readonly i18n: I18nService,
  ) {}

  @Get('show')
  async show(@Query() query: DocumentQueryDto) {
    return buildSuccess(true, await this.service.showDocument(query));
  }

  @Get('history')
  async history(@Query() query: DocumentQueryDto) {
    return buildSuccess(true, await this.service.documentHistory(query));
  }

  @Get('generate-url')
  @ApiOperation({ summary: 'Generate signed document confirmation URL' })
  async generateUrl(@Query() query: GenerateConfirmationUrlDto) {
    return buildSuccess(
      true,
      await this.service.generateConfirmationUrl(query),
    );
  }

  @Post('document-confirm')
  async confirmDocument(@Body() dto: DocumentConfirmDto) {
    await this.service.confirmDocument(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}

// Public routes (no auth.hybrid):
//   POST /api/v1/document/update — only_office callback
//   POST /api/v1/document/signature — signed URL from generateConfirmationUrl
//   POST /api/v1/document/application-confirmation — application signed URL
//   POST /api/v1/document/view/{model}/{uuid} — view URL generator
@ApiTags('Confirmation / Document Public')
@Controller('api/v1/document')
export class DocumentPublicController {
  constructor(private readonly service: DocumentService) {}

  @Public()
  @RawResponse()
  @Post('update')
  // OnlyOffice DS faqat HTTP 200 ni muvaffaqiyat deb biladi. NestJS @Post default
  // 201 qaytaradi → DS "saqlab bo'lmadi" deydi. Laravel 200 qaytaradi — parity.
  @HttpCode(200)
  @ApiOperation({ summary: 'OnlyOffice callback (only_office_ip middleware)' })
  async updateOfficeCallback(
    @Query() query: DocumentUpdateQueryDto,
    @Body() dto: DocumentUpdateDto,
  ) {
    return this.service.updateDocument(query, dto);
  }

  @Public()
  @Post('view/:model/:uuid')
  @ApiOperation({ summary: 'Generate document view URL' })
  async view(@Param('model') model: string, @Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.viewDocument(model, uuid));
  }

  // Laravel: POST v1/document/signature — generate-url'dan kelgan token bilan
  // hujjatni tekshirish (status=check) yoki imzolash.
  @Public()
  @Post('signature')
  @ApiOperation({
    summary: 'Token orqali hujjatni imzolash / tekshirish (signed URL)',
  })
  async signByToken(
    @Query('token') token: string,
    @Body() dto: DocumentSignTokenDto,
  ) {
    const result = await this.service.signWithToken(token, dto);
    if (result.data !== undefined) {
      return buildSuccess(true, result.data);
    }
    return buildSuccess(result.message ?? true, []);
  }
}
