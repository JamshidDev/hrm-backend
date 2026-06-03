// User extras controller. Laravel: UserController qo'shimcha endpointlari.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { UserExtrasService } from '@/modules/user/extras/extras.service';
import {
  AccessForAdminDto,
  ChangeCurrentOrganizationDto,
  MarkNotificationsDto,
  NotificationsQueryDto,
  OrganizationHrsQueryDto,
  UpdateOrganizationInfoDto,
  UpdateUserDto,
} from '@/modules/user/extras/dto/extras.dto';

@ApiTags('User / Extras')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/user')
export class UserExtrasController {
  constructor(
    private readonly service: UserExtrasService,
    private readonly i18n: I18nService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user info + worker brief' })
  async me() {
    return buildSuccess(true, await this.service.me());
  }

  @Get('notifications')
  @ApiOperation({ summary: 'User notifications (stub)' })
  async notifications(@Query() q: NotificationsQueryDto) {
    return buildSuccess(true, await this.service.notifications(q));
  }

  @Post('notifications/mark-read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markRead(@Body() dto: MarkNotificationsDto) {
    return buildSuccess(true, await this.service.markRead(dto));
  }

  @Get('roles')
  @ApiOperation({ summary: 'Current user roles (stub)' })
  async roles() {
    return buildSuccess(true, await this.service.roles());
  }

  @Put('change-organization')
  @ApiOperation({ summary: 'Change current organization' })
  async changeOrg(@Body() dto: ChangeCurrentOrganizationDto) {
    return buildSuccess(true, await this.service.changeOrganization(dto));
  }

  @Put('update')
  @ApiOperation({ summary: 'Update user phone/password (stub)' })
  async update(@Body() dto: UpdateUserDto) {
    return buildSuccess(true, await this.service.update(dto));
  }

  @Get('organization-info')
  @ApiOperation({ summary: 'Current user organization edit info' })
  async orgInfo() {
    return buildSuccess(true, await this.service.organizationInfo());
  }

  @Put('organization-info')
  @ApiOperation({
    summary: 'Update organization command_address/city_id/address',
  })
  async updateOrgInfo(@Body() dto: UpdateOrganizationInfoDto) {
    await this.service.updateOrganizationInfo(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('organization-hr')
  @ApiOperation({ summary: 'Organization HR list (stub)' })
  async organizationHrs(@Query() q: OrganizationHrsQueryDto) {
    return buildSuccess(true, await this.service.organizationHrs(q));
  }

  @Post('access-for-admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check admin access token (stub)' })
  async accessForAdmin(@Body() dto: AccessForAdminDto) {
    return buildSuccess(true, await this.service.accessForAdmin(dto));
  }
}
