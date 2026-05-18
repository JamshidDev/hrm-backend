import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { AdminUserService } from '@/modules/admin/users/admin-user.service';
import {
  AssignAdminUserRoleDto,
  AttachAdminUserPermissionDto,
  BlockAdminUserDto,
  DetachAdminUserPermissionDto,
  DetachAdminUserRoleDto,
  QueryAdminUserDirectPermissionDto,
  GenerateAdminUserTokenDto,
  QueryAdminUserDto,
  AdminUserListResponseDto,
  AdminUserDirectPermissionListResponseDto,
} from '@/modules/admin/users/dto/admin-user.dto';

@ApiTags('Admin / Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin')
export class AdminUserController {
  constructor(
    private readonly service: AdminUserService,
    private readonly i18n: I18nService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Users list' })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  async findAll(@Query() query: QueryAdminUserDto) {
    return this.service.findAll(query);
  }

  @Get('users/direct-permissions')
  @ApiOperation({ summary: 'Users with direct permissions' })
  @ApiOkResponse({ type: AdminUserDirectPermissionListResponseDto })
  async findAllWithDirectPermissions(
    @Query() query: QueryAdminUserDirectPermissionDto,
  ) {
    return this.service.findAllWithDirectPermissions(query);
  }

  @Get('access-for-admin')
  @ApiOperation({ summary: 'Generate one-time JWT to login as another user' })
  @ApiOkResponse()
  getTokenForAdmin(@Query() dto: GenerateAdminUserTokenDto) {
    return this.service.getTokenForAdmin(dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('users/:userUuid/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block / unblock user' })
  @ApiOkResponse()
  async block(@Param('userUuid') uuid: string, @Body() dto: BlockAdminUserDto) {
    await this.service.block(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('users/:userUuid/roles')
  @ApiOperation({ summary: 'User roles list' })
  @ApiOkResponse()
  async getUserRoles(@Param('userUuid') uuid: string) {
    return this.service.getUserRoles(uuid);
  }

  @Put('users/:userUuid/roles/detach')
  @ApiOperation({ summary: 'Detach role from user' })
  @ApiOkResponse()
  async detachUserRole(
    @Param('userUuid') uuid: string,
    @Body() dto: DetachAdminUserRoleDto,
  ) {
    await this.service.detachUserRole(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('assign-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiOkResponse()
  async assignRoleToUser(@Body() dto: AssignAdminUserRoleDto) {
    await this.service.assignRoleToUser(dto);
    return buildSuccess(this.i18n.t('messages.role_successfully_assigned'), []);
  }

  @Get('users/:userUuid/permissions')
  @ApiOperation({ summary: 'User permissions (direct + via roles)' })
  @ApiOkResponse()
  async getUserPermissions(@Param('userUuid') uuid: string) {
    return this.service.getUserPermissions(uuid);
  }

  @Post('users/:userUuid/permissions/attach')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attach direct permissions to user' })
  @ApiOkResponse()
  async attachPermission(
    @Param('userUuid') uuid: string,
    @Body() dto: AttachAdminUserPermissionDto,
  ) {
    await this.service.attachPermission(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Put('users/:userUuid/permissions/detach')
  @ApiOperation({ summary: 'Detach direct permissions from user' })
  @ApiOkResponse()
  async detachPermission(
    @Param('userUuid') uuid: string,
    @Body() dto: DetachAdminUserPermissionDto,
  ) {
    await this.service.detachPermission(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('users/:userUuid/login')
  @RawResponse()
  @ApiOperation({ summary: 'Login as another user (sudo)' })
  @ApiOkResponse()
  async loginAsUser(@Param('userUuid') uuid: string) {
    return this.service.loginAsUser(uuid);
  }
}
