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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
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
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Organization documents (visibility-filtered)' })
  @ApiOkResponse({ type: OrganizationDocumentListResponseDto })
  async findAll(@Query() query: QueryOrganizationDocumentDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  async create(
    @Body() dto: CreateOrganizationDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.create(dto, file);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(id, dto, file);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  // Laravel method spoofing — multipart/form-data bilan PUT yuborolmaganda
  // frontend `POST` + `_method=PUT` ishlatadi. method-override multipart body'ni
  // ko'ra olmaydi (kech parse bo'ladi), shu sabab alohida route.
  @Post(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update (Laravel _method=PUT spoofing)' })
  async updateSpoofed(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(id, dto, file);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
