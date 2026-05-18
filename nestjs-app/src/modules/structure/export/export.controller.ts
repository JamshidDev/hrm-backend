import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { ExportService } from '@/modules/structure/export/export.service';

@ApiTags('Structure / Export')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get('export/tasks-count')
  @ApiOperation({ summary: 'Unread export tasks count' })
  @ApiOkResponse()
  async getUnreadCount() {
    return this.service.getUnreadCount();
  }

  @Post('export/tasks-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark export tasks as read (all or by ids)' })
  @ApiOkResponse()
  async markAsRead(@Body() body: { all?: boolean; ids?: number[] }) {
    await this.service.markAsRead(body);
    // Laravel: Helper::response(null) → {message: null, error: false, data: null} format.
    return null;
  }

  @Get('report-export')
  @ApiOperation({ summary: 'Available report export types' })
  @ApiOkResponse()
  async getReportExportList() {
    return this.service.getReportExportList();
  }

  // TODO: POST /report-export — job queue (BullMQ) kerak. Alohida sessiya.
}
