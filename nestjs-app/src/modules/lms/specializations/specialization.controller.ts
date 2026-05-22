// Specializations controller. Laravel: SpecializationController (Route::resource).

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
import { buildSuccess } from '@/common/utils/response.util';
import { LmsSpecializationService } from '@/modules/lms/specializations/specialization.service';
import {
  SpecializationListQueryDto,
  UpsertSpecializationDto,
} from '@/modules/lms/specializations/dto/specialization.dto';

@ApiTags('LMS / Specializations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/specializations')
export class LmsSpecializationController {
  constructor(
    private readonly service: LmsSpecializationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List specializations (paginated)' })
  async list(@Query() q: SpecializationListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specialization by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create specialization' })
  async create(@Body() dto: UpsertSpecializationDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update specialization' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertSpecializationDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete specialization' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
