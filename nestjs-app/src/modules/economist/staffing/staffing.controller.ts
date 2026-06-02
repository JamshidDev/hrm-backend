// Staffing approve controller. Laravel: Economist/StaffingApproveController.
// Routes (Laravel parity — prefix economist, permission:economist):
//   GET    staffing/generate    → viewGenerateChanges (changedPositions)
//   POST   staffing/generate    → generate
//   GET    staffing/approve      → index (ApproveIndexResource paginated)
//   DELETE staffing/approve/{id} → destroy

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { StaffingService } from '@/modules/economist/staffing/staffing.service';
import {
  StaffingGenerateViewQueryDto,
  StaffingGenerateDto,
  StaffingApproveListQueryDto,
} from '@/modules/economist/staffing/dto/staffing.dto';

@ApiTags('Economist / Staffing')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist/staffing')
export class StaffingController {
  constructor(
    private readonly service: StaffingService,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/economist/staffing/generate — shtat o'zgarishlari (changedPositions).
  @Get('generate')
  @ApiOperation({
    summary:
      'Preview staffing diff — changed department_positions (Laravel parity)',
  })
  async generateView(@Query() q: StaffingGenerateViewQueryDto) {
    return buildSuccess(true, await this.service.generateView(q));
  }

  // POST /api/v1/economist/staffing/generate — hujjat generatsiyasi.
  @Post('generate')
  @ApiOperation({
    summary: 'Generate staffing-approve document (Laravel DocumentReplace)',
  })
  async generate(@Body() body: StaffingGenerateDto) {
    await this.service.generate(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  // GET /api/v1/economist/staffing/approve — tasdiqlash ro'yxati (ApproveIndexResource).
  @Get('approve')
  @ApiOperation({ summary: 'List staffing-approve records (paginated)' })
  async approveList(@Query() q: StaffingApproveListQueryDto) {
    return buildSuccess(true, await this.service.approveList(q));
  }

  // DELETE /api/v1/economist/staffing/approve/{id} — soft-delete (tasdiqlangan bo'lmasa).
  @Delete('approve/:id')
  @ApiOperation({
    summary: 'Soft-delete a staffing-approve record (unless approved)',
  })
  async approveDestroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.approveDestroy(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
