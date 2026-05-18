import {
  Body,
  Controller,
  Delete,
  Get,
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
import { buildSuccess } from '@/common/utils/response.util';
import { RoleService } from '@/modules/admin/roles/role.service';
import {
  QueryRoleDto,
  RoleListResponseDto,
  CreateRoleDto,
  UpdateRoleDto,
} from '@/modules/admin/roles/dto/role.dto';

@ApiTags('Admin / Roles')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/roles')
export class RoleController {
  constructor(
    private readonly service: RoleService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Roles list' })
  @ApiOkResponse({ type: RoleListResponseDto })
  async findAll(@Query() query: QueryRoleDto) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create role' })
  @ApiOkResponse()
  async create(@Body() dto: CreateRoleDto) {
    await this.service.create(dto);
    // Laravel: Helper::response(trans('messages.successfully_stored')) → flat-style obj
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
