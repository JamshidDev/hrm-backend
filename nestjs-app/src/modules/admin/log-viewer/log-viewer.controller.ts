// Log-viewer token. Laravel: Admin AuthController::generateLogViewerToken
// (admin group, permission:users-write).
//
// QAYD: Laravel log-viewer PAKETI uchun (Cache'da token saqlab, /log-viewer UI'ga
// ruxsat beradi). NestJS'da /log-viewer route va Cache middleware yo'q — bu shape-
// faithful versiya: token + cookie + {url}. Haqiqiy log-viewer Laravel tarafda qoladi.

import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';

@ApiTags('Admin / Log Viewer')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin')
export class LogViewerController {
  constructor(private readonly config: ConfigService) {}

  // GET /api/v1/admin/generate-log-viewer — xom {url} + log_viewer_token cookie.
  @Get('generate-log-viewer')
  @ApiOperation({ summary: 'Generate log-viewer access token (cookie + url)' })
  generate(@Res() res: Response) {
    // Str::random(64).
    const token = randomBytes(48).toString('base64url').slice(0, 64);
    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:8001');

    // Laravel: ->cookie('log_viewer_token', $token, 120 min, '/', domain, secure,
    //          httpOnly, false, 'None').
    res.cookie('log_viewer_token', token, {
      maxAge: 120 * 60 * 1000,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });

    // Laravel response()->json(['url' => url('/log-viewer')]) — interceptor wrap'siz xom JSON.
    res.json({ url: `${baseUrl}/log-viewer` });
  }
}
