// 3 ta concrete controller: contract-types, contract-additional-types, command-types.
// Hamma bir xil generic DocumentTypeService ishlatadi — faqat table + enumMap + folder farq qiladi.

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
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import {
  contract_types,
  contract_additional_types,
  command_types,
} from '@/db/schema';
import { DocumentTypeService } from '@/modules/structure/document-types/document-type.service';
import {
  CONTRACT_TYPE_ENUM_MAP,
  CONTRACT_ADDITIONAL_TYPE_ENUM_MAP,
} from '@/modules/structure/document-types/document-type.enums';
import { QueryDocumentTypeDto } from '@/modules/structure/document-types/dto/document-type.dto';
import { validateDocumentTypeStore } from '@/modules/structure/document-types/document-type.validation';

// Helpers — multipart body fields parser (Laravel `type`, `organizations` form data).
function parseOrganizations(input: unknown): number[] {
  if (typeof input !== 'string') return [];
  return input
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

function parseInteger(input: unknown): number {
  const n = Number(input);
  if (Number.isNaN(n)) return 0;
  return n;
}

@ApiTags('Structure / ContractTypes')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/contract-types')
export class ContractTypeController {
  private readonly cfg = {
    table: contract_types as never,
    enumMap: CONTRACT_TYPE_ENUM_MAP,
  };
  private readonly folder = 'contract-types';

  constructor(
    private readonly service: DocumentTypeService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Contract types list' })
  @ApiOkResponse()
  async findAll(@Query() query: QueryDocumentTypeDto) {
    return this.service.findAll(this.cfg, query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create contract type (upload doc/docx, bulk per organization)',
  })
  @ApiOkResponse()
  async create(
    @Body() body: { type?: string; organizations?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    validateDocumentTypeStore(body?.type, body?.organizations, file);
    await this.service.create(
      this.cfg,
      this.folder,
      parseInteger(body?.type),
      parseOrganizations(body?.organizations),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update contract type (file optional)' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { organization_id?: string; type?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(
      this.cfg,
      this.folder,
      id,
      parseInteger(body?.organization_id),
      parseInteger(body?.type),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete contract type (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(this.cfg, id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

@ApiTags('Structure / ContractAdditionalTypes')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/contract-additional-types')
export class ContractAdditionalTypeController {
  private readonly cfg = {
    table: contract_additional_types as never,
    enumMap: CONTRACT_ADDITIONAL_TYPE_ENUM_MAP,
  };
  private readonly folder = 'contract-additional-types';

  constructor(
    private readonly service: DocumentTypeService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Contract additional types list' })
  @ApiOkResponse()
  async findAll(@Query() query: QueryDocumentTypeDto) {
    return this.service.findAll(this.cfg, query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create contract additional type' })
  @ApiOkResponse()
  async create(
    @Body() body: { type?: string; organizations?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    validateDocumentTypeStore(body?.type, body?.organizations, file);
    await this.service.create(
      this.cfg,
      this.folder,
      parseInteger(body?.type),
      parseOrganizations(body?.organizations),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update contract additional type' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { organization_id?: string; type?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(
      this.cfg,
      this.folder,
      id,
      parseInteger(body?.organization_id),
      parseInteger(body?.type),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete contract additional type (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(this.cfg, id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Note: CommandType Laravel'da ContractTypeResource ishlatadi (xato yoki ataylab?)
// → BIR XIL CONTRACT_TYPE_ENUM_MAP'dan foydalanadi.
// Folder: 'command-types' (store) / 'document-examples' (update). Update uses
// different folder than store — Laravel quirk.
@ApiTags('Structure / CommandTypes')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/command-types')
export class CommandTypeController {
  private readonly cfg = {
    table: command_types as never,
    enumMap: CONTRACT_TYPE_ENUM_MAP,
  };
  private readonly folderStore = 'command-types';
  private readonly folderUpdate = 'document-examples';

  constructor(
    private readonly service: DocumentTypeService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Command types list' })
  @ApiOkResponse()
  async findAll(@Query() query: QueryDocumentTypeDto) {
    return this.service.findAll(this.cfg, query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create command type' })
  @ApiOkResponse()
  async create(
    @Body() body: { type?: string; organizations?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    validateDocumentTypeStore(body?.type, body?.organizations, file);
    await this.service.create(
      this.cfg,
      this.folderStore,
      parseInteger(body?.type),
      parseOrganizations(body?.organizations),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update command type' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { organization_id?: string; type?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.service.update(
      this.cfg,
      this.folderUpdate,
      id,
      parseInteger(body?.organization_id),
      parseInteger(body?.type),
      file,
    );
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete command type (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(this.cfg, id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
