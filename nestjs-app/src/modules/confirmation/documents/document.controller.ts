// Document controller. Laravel: Confirmation/DocumentController + DocumentConfirmationController.

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DocumentService } from '@/modules/confirmation/documents/document.service';
import {
  DocumentBase64QueryDto,
  DocumentConfirmDto,
  DocumentQueryDto,
  DocumentSignatureDto,
  DocumentUpdateDto,
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
    await this.service.signature(dto);
    return buildSuccess(this.i18n.t('messages.signature.success'), []);
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
    return buildSuccess(true, await this.service.generateConfirmationUrl(query));
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
  @Post('update')
  @ApiOperation({ summary: 'OnlyOffice callback (only_office_ip middleware)' })
  async updateOfficeCallback(@Body() dto: DocumentUpdateDto) {
    return this.service.updateDocument(dto);
  }

  @Public()
  @Post('view/:model/:uuid')
  @ApiOperation({ summary: 'Generate document view URL' })
  async view(@Param('model') model: string, @Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.viewDocument(model, uuid));
  }
}
