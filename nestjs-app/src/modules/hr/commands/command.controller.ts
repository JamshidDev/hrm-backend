// Command controller. Laravel: HR/CommandController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { CommandService } from '@/modules/hr/commands/command.service';
import { CommandReplaceService } from '@/modules/hr/commands/command-replace.service';
import { ConvertService } from '@/shared/convert/convert.service';
import {
  CheckWorkerPositionAdditionalQueryDto,
  CommandListResponseDto,
  CreateCommandDto,
  QueryCommandDto,
} from '@/modules/hr/commands/dto/command.dto';

@ApiTags('HR / Commands')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/commands')
export class CommandController {
  constructor(
    private readonly service: CommandService,
    private readonly i18n: I18nService,
    private readonly replace: CommandReplaceService,
    private readonly convert: ConvertService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Commands list (with workers[] via command_confirmations)' })
  @ApiOkResponse({ type: CommandListResponseDto })
  async findAll(@Query() query: QueryCommandDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Create command — status=view → PDF preview, else record' })
  async create(@Body() dto: CreateCommandDto, @Res() res: Response) {
    // Laravel: status='view' → command DB ga yozilmaydi, PDF preview qaytariladi.
    if (dto.status === 'view') {
      if (!CommandReplaceService.SUPPORTED_TYPES.includes(dto.command_type)) {
        // Boshqa type'lar hali implement qilinmagan.
        res.status(200).json({
          message: this.i18n.t('messages.invalid_type'),
          error: true,
          data: [],
        });
        return;
      }
      const docx = await this.replace.buildDeleteTypeDocx(dto);
      const pdf = await this.convert.docxToPdf(docx);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="command-preview.pdf"',
      );
      res.setHeader('Content-Length', String(pdf.length));
      res.end(pdf);
      return;
    }

    res.status(200).json(
      buildSuccess(
        this.i18n.t('messages.successfully_stored'),
        await this.service.create(dto),
      ),
    );
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Delete command (cannot delete if confirmed=SUCCESS)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Laravel: GET /api/v1/hr/worker-additional/{workerPositionId}?type=...
@ApiTags('HR / Commands')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class WorkerAdditionalController {
  constructor(private readonly service: CommandService) {}

  @Get('worker-additional/:id')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({
    summary:
      'Worker position additional data (pension/coefficient/compensation/financial_assistance)',
  })
  async checkWorkerPositionAdditional(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CheckWorkerPositionAdditionalQueryDto,
  ) {
    return buildSuccess(
      true,
      await this.service.checkWorkerPositionAdditional(id, query.type),
    );
  }
}
