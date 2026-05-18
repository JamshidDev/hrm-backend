// ConfirmationWorker controller. Laravel: HR/ConfirmationWorkerController.

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
import { ConfirmationWorkerService } from '@/modules/hr/confirmation-workers/confirmation-worker.service';
import {
  ConfirmationWorkerListResponseDto,
  CreateConfirmationWorkerDto,
  QueryConfirmationWorkerDto,
  UpdateConfirmationWorkerDto,
} from '@/modules/hr/confirmation-workers/dto/confirmation-worker.dto';

@ApiTags('HR / Confirmation Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/confirmation-workers')
export class ConfirmationWorkerController {
  constructor(
    private readonly service: ConfirmationWorkerService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Confirmation workers list (own organization)' })
  @ApiOkResponse({ type: ConfirmationWorkerListResponseDto })
  async findAll(@Query() query: QueryConfirmationWorkerDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateConfirmationWorkerDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfirmationWorkerDto,
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
