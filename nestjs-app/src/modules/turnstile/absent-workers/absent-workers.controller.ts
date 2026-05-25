// Turnstile absent-scheduled-workers controller.
// Laravel: TurnstileController::absentScheduledWorkers
//   GET /api/v1/turnstile/absent-scheduled-workers
//   middleware: permission:turnstile-absent-workers-export

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { AbsentWorkersService } from '@/modules/turnstile/absent-workers/absent-workers.service';
import { AbsentWorkersQueryDto } from '@/modules/turnstile/absent-workers/dto/absent-workers.dto';

@ApiTags('Turnstile / Absent Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Controller('api/v1/turnstile')
export class AbsentWorkersController {
  constructor(
    private readonly service: AbsentWorkersService,
    private readonly i18n: I18nService,
  ) {}

  // Jadvalga qo'yilgan, lekin kelmagan xodimlar — fonda Excel eksport.
  @Get('absent-scheduled-workers')
  @Permission('turnstile-absent-workers-export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export absent scheduled workers (background task)',
  })
  @ApiOkResponse()
  async absentScheduledWorkers(@Query() dto: AbsentWorkersQueryDto) {
    await this.service.exportAbsentWorkers(dto);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }
}
