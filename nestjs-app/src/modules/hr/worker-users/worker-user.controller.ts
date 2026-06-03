// WorkerUser controller. Laravel: HR/WorkerUserController.

import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerUserService } from '@/modules/hr/worker-users/worker-user.service';
import {
  AttachWorkerRoleDto,
  DetachWorkerRoleDto,
  QueryWorkerUserDto,
  UpdatePasswordDto,
  UpdateProfileDto,
} from '@/modules/hr/worker-users/dto/worker-user.dto';

@ApiTags('HR / Worker Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/extra/users')
export class WorkerUserController {
  constructor(
    private readonly service: WorkerUserService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('extra-worker-user')
  @ApiOperation({ summary: 'List worker users with roles' })
  async findAll(@Query() query: QueryWorkerUserDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Post('attach-role')
  @UseGuards(PermissionGuard)
  @Permission('extra-worker-user')
  async attachRole(@Body() dto: AttachWorkerRoleDto) {
    await this.service.attachRole(dto);
    return buildSuccess(this.i18n.t('messages.role_successfully_assigned'), []);
  }

  @Post('detach-role')
  @UseGuards(PermissionGuard)
  @Permission('extra-worker-user')
  async detachRole(@Body() dto: DetachWorkerRoleDto) {
    await this.service.detachRole(dto);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('update-password')
  @UseGuards(PermissionGuard)
  @Permission('extra-worker-user')
  async updatePassword(@Body() dto: UpdatePasswordDto) {
    await this.service.updatePassword(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Put('update')
  @UseGuards(PermissionGuard)
  @Permission('extra-worker-user')
  async updateProfile(@Body() dto: UpdateProfileDto) {
    await this.service.updateProfile(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
