// Med controller. Laravel: HR/MedController (resource).
// Routes: /api/v1/hr/worker-meds (index/store/show/update/destroy).

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
import { MedService } from '@/modules/hr/meds/med.service';
import {
  CreateMedDto,
  QueryMedDto,
  UpdateMedDto,
} from '@/modules/hr/meds/dto/med.dto';

@ApiTags('HR / Worker Meds')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-meds')
export class MedController {
  constructor(
    private readonly service: MedService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker meds list' })
  async findAll(@Query() query: QueryMedDto) {
    return buildSuccess(true, await this.service.findAll(query));
  }

  @Get(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Med detail' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateMedDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedDto,
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
