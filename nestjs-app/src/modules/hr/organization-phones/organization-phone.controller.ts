// OrganizationPhone controller. Laravel: Structure/OrganizationPhoneController via HR routes.

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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { OrganizationPhoneService } from '@/modules/hr/organization-phones/organization-phone.service';
import {
  CreateOrganizationPhoneDto,
  QueryOrganizationPhoneDto,
  UpdateOrganizationPhoneDto,
} from '@/modules/hr/organization-phones/dto/organization-phone.dto';

@ApiTags('HR / Organization Phones')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/organization-phones')
export class OrganizationPhoneController {
  constructor(
    private readonly service: OrganizationPhoneService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async findAll(@Query() query: QueryOrganizationPhoneDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreateOrganizationPhoneDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationPhoneDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(true, this.i18n.t('messages.successfully_deleted'));
  }
}

// Laravel: GET /api/v1/hr/organization-phones-list (alohida route).
@ApiTags('HR / Organization Phones')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class OrganizationPhoneListController {
  constructor(private readonly service: OrganizationPhoneService) {}

  @Get('organization-phones-list')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'List phones for current user organization' })
  async list() {
    return buildSuccess(true, await this.service.list());
  }
}
