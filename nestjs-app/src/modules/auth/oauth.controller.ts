import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { OAuthService } from '@/modules/auth/oauth.service';
import {
  OAuthCheckCodeDto,
  OAuthCheckCodeResponseDto,
  OAuthGenerateCodeDto,
  OAuthGenerateCodeResponseDto,
} from '@/modules/auth/dto/auth.dto';

@ApiTags('OAuth')
@Controller('api/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Exchange OAuth auth code for user info' })
  @ApiOkResponse({ type: OAuthCheckCodeResponseDto })
  async token(
    @Body() dto: OAuthCheckCodeDto,
  ): Promise<OAuthCheckCodeResponseDto> {
    return this.oauth.exchangeAuthCode(dto);
  }

  @Post('auth-code')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthHybridGuard)
  @ApiOperation({ summary: 'Generate OAuth auth code (authenticated)' })
  @ApiOkResponse({ type: OAuthGenerateCodeResponseDto })
  async authCode(
    @Body() dto: OAuthGenerateCodeDto,
  ): Promise<OAuthGenerateCodeResponseDto> {
    return this.oauth.generateAuthCode(dto);
  }
}
