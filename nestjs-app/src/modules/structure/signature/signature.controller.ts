// Signature (E-IMZO) controller. Laravel: routes/api.php `v1/signature` (public).

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { SignatureService } from '@/modules/structure/signature/signature.service';
import { SignatureAuthDto } from '@/modules/structure/signature/dto/signature.dto';

@ApiTags('Signature (E-IMZO)')
@Controller('api/v1/signature')
export class SignatureController {
  constructor(private readonly service: SignatureService) {}

  // Laravel: Helper::response(true, $response->json()).
  @Get('challenge')
  @Public()
  @ApiOperation({ summary: 'E-IMZO challenge (public)' })
  async challenge() {
    return buildSuccess(true, await this.service.challenge());
  }

  // Laravel: response()->json({access_token, message}) — RAW (Helper::response emas).
  @Post('auth')
  @Public()
  @RawResponse()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E-IMZO auth — pkcs7 orqali login (public)' })
  async auth(@Body() dto: SignatureAuthDto) {
    return this.service.auth(dto);
  }
}
