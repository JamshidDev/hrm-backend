// Economist uploads controller.
// Laravel: EconomistUploadController + EconomistController (upload/history/refresh).

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RequestContext } from '@/common/context/request.context';
import { buildSuccess } from '@/common/utils/response.util';
import { UploadService } from '@/modules/economist/uploads/upload.service';
import {
  CreateUploadDto,
  UploadHistoryFilterDto,
  UpdateUploadStatusDto,
  ConfirmUploadDto,
  RefreshWorkerPinsDto,
} from '@/modules/economist/uploads/dto/upload.dto';

@ApiTags('Economist / Uploads')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist')
export class UploadController {
  constructor(
    private readonly service: UploadService,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * POST /api/v1/economist/upload — multipart Excel upload.
   * Body: organization_id, type (1..4), year, month
   * File: `file` (xlsx/csv)
   */
  @Post('upload')
  @HttpCode(200) // Laravel Helper::response — doim 200 (NestJS POST default 201 emas)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        organization_id: { type: 'integer' },
        type: { type: 'integer', enum: [1, 2, 3, 4] },
        year: { type: 'integer' },
        month: { type: 'integer' },
      },
      required: ['file', 'organization_id', 'type', 'year', 'month'],
    },
  })
  @ApiOperation({ summary: 'Upload economist Excel (parsed inline)' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateUploadDto,
  ) {
    const result = await this.service.upload(
      {
        organization_id: body.organization_id,
        type: body.type,
        year: body.year,
        month: body.month,
        user_id: this.ctx.user?.id ?? 0,
      },
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), result);
  }

  @Get('upload-histories')
  @ApiOperation({ summary: 'List uploads grouped by type' })
  async histories(@Query() q: UploadHistoryFilterDto) {
    return buildSuccess(true, await this.service.histories(q));
  }

  @Post('upload-statuses')
  @HttpCode(200) // Laravel Helper::response — doim 200
  @ApiOperation({
    summary: 'Toggle deadline override status for an org/period',
  })
  async updateStatus(@Body() body: UpdateUploadStatusDto) {
    await this.service.updateStatus(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Post('upload-histories/confirm')
  @HttpCode(200) // Laravel Helper::response — doim 200
  @ApiOperation({
    summary: 'Confirm (approve) the latest upload for that period',
  })
  async confirm(@Body() body: ConfirmUploadDto) {
    await this.service.confirmed(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('refresh-worker-pins')
  @ApiOperation({
    summary: 'Refresh worker_id mapping by PIN (raw UPDATE)',
  })
  async refresh(@Query() q: RefreshWorkerPinsDto) {
    await this.service.refreshWorkerPins(q);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
