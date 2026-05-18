// OrganizationDocument controller. Laravel: HR/OrganizationDocumentController.

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
import { OrganizationDocumentService } from '@/modules/hr/organization-documents/organization-document.service';
import {
  CreateOrganizationDocumentDto,
  OrganizationDocumentListResponseDto,
  QueryOrganizationDocumentDto,
  UpdateOrganizationDocumentDto,
} from '@/modules/hr/organization-documents/dto/organization-document.dto';

@ApiTags('HR / Organization Documents')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/organization-documents')
export class OrganizationDocumentController {
  constructor(
    private readonly service: OrganizationDocumentService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Organization documents (visibility-filtered)' })
  @ApiOkResponse({ type: OrganizationDocumentListResponseDto })
  async findAll(@Query() query: QueryOrganizationDocumentDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateOrganizationDocumentDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDocumentDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
