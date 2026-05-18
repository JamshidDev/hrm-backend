// Economist enums controller. Laravel: EconomistController->enums + structure.

import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { EconomistEnumsService } from '@/modules/economist/enums-endpoint/enums.service';
import { StructureQueryDto } from '@/modules/economist/enums-endpoint/dto/structure-query.dto';

@ApiTags('Economist / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist')
export class EconomistEnumsController {
  constructor(private readonly service: EconomistEnumsService) {}

  @Get('enums')
  @ApiOperation({
    summary: 'Economist enums (upload types, statuses, code names)',
  })
  enums(@Headers('accept-language') acceptLang?: string) {
    // 'uz', 'ru', 'en' bo'lishi mumkin; default 'uz'
    const lang = (acceptLang ?? 'uz').split(',')[0].split('-')[0].trim();
    return buildSuccess(true, this.service.enums(lang));
  }

  @Get('structure')
  @ApiOperation({ summary: 'Organization structure tree + upload deadline' })
  async structure(@Query() q: StructureQueryDto) {
    return buildSuccess(true, await this.service.structure(q));
  }
}
