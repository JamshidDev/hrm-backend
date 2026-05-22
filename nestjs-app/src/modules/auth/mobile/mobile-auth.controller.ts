// Mobile Auth controller. Laravel: MobileAuthController.
// 2 endpoint: POST /auth/mobile/login, POST /auth/mobile/refresh.
// Public — token bo'lmasa ham qabul qiladi (login uchun).

import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { MobileAuthService } from '@/modules/auth/mobile/mobile-auth.service';
import {
  MobileLoginDto,
  MobileRefreshDto,
} from '@/modules/auth/mobile/dto/mobile-auth.dto';

@ApiTags('Auth / Mobile')
@Controller('api/auth/mobile')
export class MobileAuthController {
  constructor(private readonly service: MobileAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mobile JWT login (stub)' })
  async login(
    @Body() dto: MobileLoginDto,
    @Headers('x-device-uuid') deviceUuid?: string,
    @Headers('x-auth-type') authType?: string,
  ) {
    return this.service.login(dto, deviceUuid, authType);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mobile JWT refresh (stub)' })
  async refresh(
    @Body() dto: MobileRefreshDto,
    @Headers('x-device-uuid') deviceUuid?: string,
    @Headers('x-auth-type') authType?: string,
  ) {
    return this.service.refresh(dto, deviceUuid, authType);
  }
}
