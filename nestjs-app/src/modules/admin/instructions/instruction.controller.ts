// AppInstruction controller. Laravel: AppInstructionController.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { InstructionService } from '@/modules/admin/instructions/instruction.service';
import {
  CreateInstructionDto,
  InstructionExportQueryDto,
  InstructionListQueryDto,
  UpdateInstructionDto,
} from '@/modules/admin/instructions/dto/instruction.dto';

@ApiTags('Admin / Instructions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/admin')
export class InstructionController {
  constructor(
    private readonly service: InstructionService,
    private readonly i18n: I18nService,
  ) {}

  @Get('instructions')
  @ApiOperation({
    summary: 'List app instructions (paginated, filter: menu/sub_menu)',
  })
  async list(@Query() q: InstructionListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('instructions')
  @ApiOperation({
    summary: 'Create instruction (photos: stub, real MinIO upload keyin)',
  })
  async create(@Body() dto: CreateInstructionDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  // PUT (JSON) — partial update.
  @Put('instructions/:appInstructionId')
  @ApiOperation({ summary: 'Update instruction (JSON, partial)' })
  async update(
    @Param('appInstructionId', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructionDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  // POST(:id) — frontend FormData + `_method=PUT` (method-override multipart'ni o'qiy
  // olmaydi). menu/sub_menu/title/text + photo fayllar.
  @Post('instructions/:appInstructionId')
  @HttpCode(200)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Update instruction (multipart FormData, _method=PUT)',
  })
  async updateMultipart(
    @Param('appInstructionId', ParseIntPipe) id: number,
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.service.updateFromForm(
      id,
      (req.body ?? {}) as Record<string, unknown>,
      files ?? [],
    );
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('instructions/:appInstructionId')
  @ApiOperation({
    summary: 'Delete instruction + cascade photos (soft-delete)',
  })
  async remove(@Param('appInstructionId', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Delete('instruction-photos/:photoId')
  @ApiOperation({ summary: 'Detach single photo (soft-delete)' })
  async detachPhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    await this.service.detachPhoto(photoId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('instructions-export')
  @ApiOperation({ summary: 'Export instructions to PDF (stub)' })
  async exportToPdf(@Query() q: InstructionExportQueryDto) {
    return buildSuccess(true, await this.service.exportToPdf(q));
  }
}
