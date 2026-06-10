// Activity logs controller. Laravel: Admin/ActivityLogController (admin group, permission:users-write).

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import {
  ActivityLogService,
  QueryActivityLogDto,
} from '@/modules/admin/activity-logs/activity-log.service';

@ApiTags('Admin / Activity Logs')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/activity-logs')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'List activity logs (org-scoped, paginated)' })
  async index(@Query() q: QueryActivityLogDto) {
    return buildSuccess(true, await this.service.index(q));
  }
}
