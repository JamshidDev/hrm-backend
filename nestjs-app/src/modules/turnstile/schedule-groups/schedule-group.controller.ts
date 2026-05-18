// Schedule group controller. Laravel: TurnstileScheduleGroupController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ScheduleGroupService } from '@/modules/turnstile/schedule-groups/schedule-group.service';
import {
  QueryScheduleGroupDto,
  QueryScheduleGroupWorkersDto,
  UpdateScheduleGroupDto,
} from '@/modules/turnstile/schedule-groups/dto/schedule-group.dto';

@ApiTags('Turnstile / Schedule Groups')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/schedule')
export class ScheduleGroupController {
  constructor(
    private readonly service: ScheduleGroupService,
    private readonly i18n: I18nService,
  ) {}

  @Get('schedule-groups') async groups(@Query() q: QueryScheduleGroupDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Delete('schedule-groups/:groupId') async destroy(
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    await this.service.remove(groupId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }

  @Put('schedule-groups/:groupId') async update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateScheduleGroupDto,
  ) {
    await this.service.update(groupId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Get('schedule-workers') async groupWorkers(@Query() q: QueryScheduleGroupWorkersDto) {
    return buildSuccess(true, await this.service.groupWorkers(q));
  }
}
