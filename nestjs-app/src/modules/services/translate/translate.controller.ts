// Translate controller. Laravel: POST /api/v1/services/translate.

import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TranslateService } from '@/modules/services/translate/translate.service';
import { TranslateRequestDto } from '@/modules/services/translate/dto/translate.dto';

@ApiTags('Services / Translate')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/services')
export class TranslateController {
  constructor(private readonly service: TranslateService) {}

  @Post('translate')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Document translate (LibreOffice/Pandoc stub — Laravel parity `return 1`)',
  })
  async translate(@Body() dto: TranslateRequestDto) {
    return buildSuccess(true, await this.service.translate(dto));
  }
}
