// Economist enums controller. Laravel: EconomistController->enums + structure.

import {
  Controller,
  Get,
  Headers,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { EconomistEnumsService } from '@/modules/economist/enums-endpoint/enums.service';
import { StructureQueryDto } from '@/modules/economist/enums-endpoint/dto/structure-query.dto';

@ApiTags('Economist / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('economist')
@Controller('api/v1/economist')
export class EconomistEnumsController {
  constructor(private readonly service: EconomistEnumsService) {}

  @Get('enums')
  @RawResponse()
  @ApiOperation({
    summary: 'Economist enums (upload types, statuses, code names)',
  })
  enums(
    @Res() res: Response,
    @Headers('accept-language') acceptLang?: string,
  ): void {
    // 'uz', 'ru', 'en' bo'lishi mumkin; default 'uz'
    const lang = (acceptLang ?? 'uz').split(',')[0].split('-')[0].trim();
    const { upload_types, upload_statuses, codes } = this.service.enums(lang);

    // `codes` — Laravel tartibidagi [code, name] juftliklari. JS object
    // integer-like key'larni ('107') leading-zero ('001') oldidan saralaydi,
    // shuning uchun qo'lda serialize qilamiz — Laravel bayt tartibi saqlanadi
    // (001,002,...,043,045,...). Envelope buildSuccess bilan bir xil:
    // {"message":true,"error":false,"data":{...}}.
    const codesJson =
      '{' +
      codes
        .map(
          ([code, name]) => `${JSON.stringify(code)}:${JSON.stringify(name)}`,
        )
        .join(',') +
      '}';
    const body =
      '{"message":true,"error":false,"data":{' +
      `"upload_types":${JSON.stringify(upload_types)},` +
      `"upload_statuses":${JSON.stringify(upload_statuses)},` +
      `"codes":${codesJson}}}`;

    res.type('application/json').send(body);
  }

  @Get('structure')
  @ApiOperation({ summary: 'Organization structure tree + upload deadline' })
  async structure(@Query() q: StructureQueryDto) {
    return buildSuccess(true, await this.service.structure(q));
  }
}
