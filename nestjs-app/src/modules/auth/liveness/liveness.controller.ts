// Auth Liveness controller. Laravel: UserFaceController.
// 3 endpoint — Public (Laravel: validate/complete socket-server-api middleware bilan).

import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { LivenessService } from '@/modules/auth/liveness/liveness.service';
import {
  CompleteLivenessDto,
  StartLivenessDto,
  ValidateLivenessDto,
} from '@/modules/auth/liveness/dto/liveness.dto';

@ApiTags('Auth / Liveness')
@Controller('api/auth/v1/liveness')
export class LivenessController {
  constructor(private readonly service: LivenessService) {}

  @Public()
  @Post('start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start face liveness session (login)' })
  async start(
    @Body() dto: StartLivenessDto,
    @Headers('x-device-uuid') deviceUuid?: string,
  ) {
    return this.service.startSession(dto, deviceUuid);
  }

  @Public()
  @Post('validate')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Validate liveness session (Laravel: socket-server-api middleware)',
  })
  async validate(@Body() dto: ValidateLivenessDto) {
    return this.service.validate(dto);
  }

  @Public()
  @Post('complete')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Complete liveness session (Laravel: socket-server-api middleware)',
  })
  async complete(@Body() dto: CompleteLivenessDto) {
    return this.service.complete(dto);
  }
}
