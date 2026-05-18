// Signature controller — E-IMZO / OnlineFlow integration stubs.
// Laravel: Structure/SignatureController.
//
// Real Laravel: forwards to gov.uz signature API.

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';

@ApiTags('Confirmation / Signature')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/confirmation')
export class SignatureController {
  @Post('init')
  @ApiOperation({ summary: 'Initialize signature session (E-IMZO stub)' })
  async init(@Body() body: Record<string, unknown>) {
    return buildSuccess(true, {
      session_id: `sig-${Date.now()}`,
      status: 'pending',
      _input: body,
    });
  }

  @Post('status')
  @ApiOperation({ summary: 'Check signature status (E-IMZO stub)' })
  async status(@Body() body: Record<string, unknown>) {
    return buildSuccess(true, {
      session_id: body.session_id ?? null,
      status: 'pending',
    });
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify signature (E-IMZO stub)' })
  async verify(@Body() body: Record<string, unknown>) {
    return buildSuccess(true, {
      verified: true,
      _input: body,
    });
  }
}
