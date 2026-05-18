// AdminUser flow'ining /user/ prefiksidagi endpoint'lari.
// Laravel: Route::prefix('user')->group(... Route::post('access-for-admin', ...))

import {
  Body,
  Controller,
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
import { AdminUserService } from '@/modules/admin/users/admin-user.service';
import { CheckAdminUserTokenDto } from '@/modules/admin/users/dto/admin-user.dto';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/user')
export class AdminUserAccessController {
  constructor(private readonly service: AdminUserService) {}

  @Post('access-for-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check admin JWT token and return Sanctum access token',
  })
  @ApiOkResponse()
  async checkTokenForAdmin(@Body() dto: CheckAdminUserTokenDto) {
    return this.service.checkTokenForAdmin(dto);
  }
}
