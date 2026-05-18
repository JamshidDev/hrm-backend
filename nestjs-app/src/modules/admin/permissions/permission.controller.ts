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
import { PermissionService } from '@/modules/admin/permissions/permission.service';
import {
  QueryPermissionDto,
  PermissionListResponseDto,
  CreatePermissionDto,
  UpdatePermissionDto,
} from '@/modules/admin/permissions/dto/permission.dto';

@ApiTags('Admin / Permissions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('users-write')
@Controller('api/v1/admin/permissions')
export class PermissionController {
  constructor(
    private readonly service: PermissionService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Permissions list' })
  @ApiOkResponse({ type: PermissionListResponseDto })
  async findAll(@Query() query: QueryPermissionDto) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create permission' })
  @ApiOkResponse()
  async create(@Body() dto: CreatePermissionDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
