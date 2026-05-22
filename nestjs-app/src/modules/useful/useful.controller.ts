// Useful controller. Laravel: UsefulController.

import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { UsefulService } from '@/modules/useful/useful.service';

@ApiTags('Useful')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/useful')
export class UsefulController {
  constructor(private readonly service: UsefulService) {}

  @Get('codex')
  @ApiOperation({ summary: 'Codex HTML (lang ga qarab uz/ru) — stub' })
  async codex(@Headers('accept-language') lang?: string) {
    return buildSuccess(true, await this.service.codex(lang));
  }

  @Get('leaders')
  @ApiOperation({ summary: 'Organization tree with leaders (stub — toTree)' })
  async leaders() {
    return buildSuccess(true, await this.service.leaders());
  }
}
