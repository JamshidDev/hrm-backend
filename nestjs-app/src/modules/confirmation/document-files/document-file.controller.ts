// DocumentFile controller. Laravel: Confirmation/DocumentFileController.

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
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { DocumentFileService } from '@/modules/confirmation/document-files/document-file.service';
import {
  CreateDocumentFileDto,
  DocumentFileIndexQueryDto,
  QueryDocumentFileDto,
  UpdateDocumentFileDto,
} from '@/modules/confirmation/document-files/dto/document-file.dto';

@ApiTags('Confirmation / Document Files')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/document/files')
export class DocumentFileController {
  constructor(
    private readonly service: DocumentFileService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Document files list (model + document_id bo'yicha)",
  })
  async findAll(@Query() query: DocumentFileIndexQueryDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Document file(lar) yuklash (multipart)' })
  async create(
    @Body() dto: CreateDocumentFileDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    await this.service.create(dto, files);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentFileDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// GET /api/v1/document/applications
@ApiTags('Confirmation / Document Files')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/document')
export class DocumentApplicationsController {
  constructor(private readonly service: DocumentFileService) {}

  @Get('applications')
  @ApiOperation({ summary: 'Document files with worker_application_id' })
  async applications(@Query() query: QueryDocumentFileDto) {
    return buildSuccess(true, await this.service.applications(query));
  }
}
