// Authentication logs controller. Laravel: Admin/AuthenticationLogController (permission:users-write).

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import {
  AuthenticationLogService,
  QueryAuthLogDto,
} from '@/modules/admin/authentication-logs/authentication-log.service';

@ApiTags('Admin / Authentication Logs')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/authentication-logs')
export class AuthenticationLogController {
  constructor(private readonly service: AuthenticationLogService) {}

  @Get()
  @ApiOperation({ summary: 'List authentication logs (org-scoped, paginated)' })
  async index(@Query() q: QueryAuthLogDto) {
    return buildSuccess(true, await this.service.index(q));
  }
}
