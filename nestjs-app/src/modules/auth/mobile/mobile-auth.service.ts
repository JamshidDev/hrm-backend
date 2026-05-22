// Mobile Auth service. Laravel: MobileAuthService.
// 2 endpoint: login (JWT issue), refresh (JWT refresh).
// Stub — real JWT implementation Phase 2B.

import { Injectable } from '@nestjs/common';
import type {
  MobileLoginDto,
  MobileRefreshDto,
} from '@/modules/auth/mobile/dto/mobile-auth.dto';

@Injectable()
export class MobileAuthService {
  /**
   * POST /auth/mobile/login — Mobile JWT login.
   * Stub: real implement phone+password verify, face match, FCM token, etc.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async login(dto: MobileLoginDto, _deviceUuid?: string, _authType?: string) {
    return {
      access_token: 'stub-jwt-access-token',
      refresh_token: 'stub-jwt-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
      stub: true,
      _phone: dto.phone,
    };
  }

  /**
   * POST /auth/mobile/refresh — JWT refresh.
   * Stub: real implement verify refresh_token, issue new pair.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async refresh(
    _dto: MobileRefreshDto,
    _deviceUuid?: string,
    _authType?: string,
  ) {
    return {
      access_token: 'stub-jwt-access-token-refreshed',
      refresh_token: 'stub-jwt-refresh-token-new',
      token_type: 'Bearer',
      expires_in: 3600,
      stub: true,
    };
  }
}
