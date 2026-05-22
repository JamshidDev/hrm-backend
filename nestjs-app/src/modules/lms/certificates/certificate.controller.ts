// Certificates controller. Laravel: LmsCertificateController.

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
import { LmsCertificateService } from '@/modules/lms/certificates/certificate.service';
import {
  CertificateListQueryDto,
  GenerateCertificateDto,
} from '@/modules/lms/certificates/dto/certificate.dto';

@ApiTags('LMS / Certificates')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
export class LmsCertificateController {
  constructor(
    private readonly service: LmsCertificateService,
    private readonly i18n: I18nService,
  ) {}

  @Get('certificates')
  @ApiOperation({ summary: 'List certificates (paginated)' })
  async list(@Query() q: CertificateListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Delete('certificates/:id')
  @ApiOperation({ summary: 'Soft-delete certificate' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('certificate/generate')
  @ApiOperation({ summary: 'Generate certificate (stub)' })
  async generate(@Body() dto: GenerateCertificateDto) {
    return buildSuccess(true, await this.service.generate(dto));
  }
}
