// EduPlans controller. Laravel: HR routes → LMS controllers.

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { EduPlanService } from '@/modules/hr/edu-plans/edu-plan.service';
import {
  AttachEduPlanWorkersDto,
  AttachedEduPlanWorkersQueryDto,
  DetachEduPlanWorkersDto,
  QueryEduPlansDto,
  SearchEduPlanWorkersDto,
} from '@/modules/hr/edu-plans/dto/edu-plan.dto';

@ApiTags('HR / Edu Plans')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/edu-plans')
export class EduPlanController {
  constructor(
    private readonly service: EduPlanService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'EduPlans list (current year)' })
  async list(@Query() query: QueryEduPlansDto) {
    return buildSuccess(true, await this.service.list(query));
  }

  @Get('search-workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  async searchWorkers(@Query() query: SearchEduPlanWorkersDto) {
    return buildSuccess(true, await this.service.searchWorkers(query));
  }

  @Post('attach-workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  async attachWorkers(@Body() dto: AttachEduPlanWorkersDto) {
    await this.service.attachWorkers(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get('attached-workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  async attachedWorkers(@Query() query: AttachedEduPlanWorkersQueryDto) {
    return buildSuccess(true, await this.service.attachedWorkers(query));
  }

  @Post('detach-workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  async detachWorkers(@Body() dto: DetachEduPlanWorkersDto) {
    await this.service.detachWorkers(dto);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
