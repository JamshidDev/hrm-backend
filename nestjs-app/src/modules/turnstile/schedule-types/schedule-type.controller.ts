// Schedule type controller. Laravel: TurnstileScheduleTypeController.

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
import { ScheduleTypeService } from '@/modules/turnstile/schedule-types/schedule-type.service';
import {
  CreateScheduleTypeDto,
  QueryScheduleTypeDto,
  UpdateScheduleTypeDto,
} from '@/modules/turnstile/schedule-types/dto/schedule-type.dto';

@ApiTags('Turnstile / Schedule Types')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/schedule')
export class ScheduleTypeController {
  constructor(
    private readonly service: ScheduleTypeService,
    private readonly i18n: I18nService,
  ) {}

  @Get('types')
  @ApiOperation({
    summary: 'List schedule types (with enum-translated type label)',
  })
  async list() {
    return buildSuccess(true, await this.service.list());
  }

  @Get('schedule-types')
  @ApiOperation({
    summary: 'List schedule types (paginated, with worker counts)',
  })
  async listByWorkers(@Query() q: QueryScheduleTypeDto) {
    return buildSuccess(true, await this.service.listByWorkers(q));
  }

  @Post('types') async store(@Body() dto: CreateScheduleTypeDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('types/:id') async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleTypeDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('types/:id') async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
