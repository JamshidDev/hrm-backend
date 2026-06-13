// Admin Mobile Users controller. Laravel: MobileController.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { AdminMobileUserService } from '@/modules/admin/mobile-users/mobile-user.service';
import { MobileUserListQueryDto } from '@/modules/admin/mobile-users/dto/mobile-user.dto';

@ApiTags('Admin / Mobile Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/mobile/users')
export class AdminMobileUserController {
  constructor(private readonly service: AdminMobileUserService) {}

  @Get()
  @ApiOperation({ summary: 'List mobile devices (paginated + search by name)' })
  async list(@Query() q: MobileUserListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Show mobile device + liveness sessions' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }
}
