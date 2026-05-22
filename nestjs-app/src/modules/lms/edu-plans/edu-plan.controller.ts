// Edu-plans controller. Laravel: EduPlanController (apiResource + 2 sub-routes).

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
import { LmsEduPlanService } from '@/modules/lms/edu-plans/edu-plan.service';
import {
  DetachEduPlanWorkersDto,
  EduPlanListQueryDto,
  UpsertEduPlanDto,
} from '@/modules/lms/edu-plans/dto/edu-plan.dto';

@ApiTags('LMS / Edu Plans')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
export class LmsEduPlanController {
  constructor(
    private readonly service: LmsEduPlanService,
    private readonly i18n: I18nService,
  ) {}

  @Get('edu-plan')
  @ApiOperation({ summary: 'List edu plans (paginated)' })
  async list(@Query() q: EduPlanListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('edu-plan/:id')
  @ApiOperation({ summary: 'Get edu plan by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('edu-plan')
  @ApiOperation({ summary: 'Create edu plan' })
  async create(@Body() dto: UpsertEduPlanDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('edu-plan/:id')
  @ApiOperation({ summary: 'Update edu plan (partial)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertEduPlanDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('edu-plan/:id')
  @ApiOperation({ summary: 'Soft-delete edu plan' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('edu-plans/:eduPlanId/attached-workers')
  @ApiOperation({ summary: 'List workers attached to edu plan' })
  async attachedWorkers(
    @Param('eduPlanId', ParseIntPipe) eduPlanId: number,
    @Query() q: EduPlanListQueryDto,
  ) {
    return buildSuccess(true, await this.service.attachedWorkers(eduPlanId, q));
  }

  @Post('edu-plans/:eduPlanId/detach-workers')
  @ApiOperation({ summary: 'Detach workers from edu plan (soft-delete)' })
  async detachWorkers(
    @Param('eduPlanId', ParseIntPipe) eduPlanId: number,
    @Body() dto: DetachEduPlanWorkersDto,
  ) {
    return buildSuccess(true, await this.service.detachWorkers(eduPlanId, dto));
  }
}
