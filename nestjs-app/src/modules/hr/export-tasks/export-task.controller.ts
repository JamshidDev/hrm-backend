// ExportTask controller. Laravel: HR/Exports/ExportTaskController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { ExportTaskService } from '@/modules/hr/export-tasks/export-task.service';
import {
  ExportTaskListResponseDto,
  QueryExportTaskDto,
} from '@/modules/hr/export-tasks/dto/export-task.dto';

@ApiTags('HR / Export Tasks')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/export')
export class ExportTaskController {
  constructor(private readonly service: ExportTaskService) {}

  @Get('tasks')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'User export tasks list (admin: all, else: own)' })
  @ApiOkResponse({ type: ExportTaskListResponseDto })
  async findAll(@Query() query: QueryExportTaskDto) {
    return this.service.findAll(query);
  }
}
