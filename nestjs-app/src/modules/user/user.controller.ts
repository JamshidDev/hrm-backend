import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { UserService } from '@/modules/user/user.service';
import { ProfileResponseDto } from '@/modules/user/dto/user.dto';
import { AuthService } from '@/modules/auth/auth.service';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Current user profile' })
  @ApiOkResponse({ type: ProfileResponseDto })
  async profile(): Promise<ProfileResponseDto> {
    return this.userService.profile();
  }

  @Get('logout')
  @ApiOperation({ summary: 'Logout — delete current Sanctum token' })
  @ApiOkResponse()
  async logout() {
    return this.authService.logout();
  }
}
