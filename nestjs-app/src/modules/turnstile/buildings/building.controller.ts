// Building controller. Laravel: Turnstile/BuildingController.

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
import { BuildingService } from '@/modules/turnstile/buildings/building.service';
import {
  CreateBuildingDto,
  QueryBuildingDto,
  UpdateBuildingDto,
} from '@/modules/turnstile/buildings/dto/building.dto';

@ApiTags('Turnstile / Buildings')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/buildings')
export class BuildingController {
  constructor(
    private readonly service: BuildingService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List buildings' })
  async index(@Query() q: QueryBuildingDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post()
  @ApiOperation({ summary: 'Create building' })
  async store(@Body() dto: CreateBuildingDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update building' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuildingDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete building (soft-delete)' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
