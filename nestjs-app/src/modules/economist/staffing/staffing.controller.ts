// Staffing approve controller. Laravel: Economist/StaffingApproveController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { StaffingService } from '@/modules/economist/staffing/staffing.service';
import {
  StaffingGenerateViewQueryDto,
  StaffingGenerateDto,
  StaffingApproveListQueryDto,
} from '@/modules/economist/staffing/dto/staffing.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Economist / Staffing')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist/staffing')
export class StaffingController {
  constructor(
    private readonly service: StaffingService,
    private readonly i18n: I18nService,
  ) {}

  @Get('generate')
  @ApiOperation({
    summary:
      'Preview staffing diff — changed department_positions (Laravel parity)',
  })
  async generateView(@Query() q: StaffingGenerateViewQueryDto) {
    return buildSuccess(true, await this.service.generateView(q));
  }

  @Post('generate')
  @ApiOperation({ summary: 'Dispatch staffing generation job' })
  async generate(@Body() body: StaffingGenerateDto) {
    await this.service.generate(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get('approve')
  @ApiOperation({ summary: 'List staffing-approve records (paginated)' })
  async approveList(@Query() q: StaffingApproveListQueryDto) {
    return buildSuccess(true, await this.service.approveList(q));
  }

  // Demo: ExcelService bilan styled .xlsx download.
  // `@RawResponse()` — `ResponseInterceptor` wrap qilmasin (Buffer to'g'ridan stream'ga).
  @Get('approve/export')
  @RawResponse()
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export staffing-approve list as styled .xlsx' })
  async approveExport(@Res() res: Response) {
    const buffer = await this.service.approveListExport();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="staffing-approves.xlsx"',
    );
    res.end(buffer);
  }

  /**
   * Demo: ExcelService bilan Laravel `StaffingApproveExport` ekvivalenti.
   * Title section (9 qator merge) + QR drawing + position data.
   */
  @Get('approve/:id/export')
  @RawResponse()
  @Header('Content-Type', XLSX_MIME)
  @ApiOperation({
    summary: 'Export full staffing-approve with title section + QR (.xlsx)',
  })
  async approveDetailExport(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.service.approveDetailExport(id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="staffing-approve-${id}.xlsx"`,
    );
    res.end(buffer);
  }

  @Delete('approve/:id')
  @ApiOperation({
    summary: 'Soft-delete a staffing-approve record (unless approved)',
  })
  async approveDestroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.approveDestroy(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
