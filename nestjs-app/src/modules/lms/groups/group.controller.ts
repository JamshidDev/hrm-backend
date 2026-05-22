// Groups controller. Laravel: GroupController + GroupWorkerController + LmsProtocolController.

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsGroupService } from '@/modules/lms/groups/group.service';
import {
  DetachGroupWorkersDto,
  GenerateGroupsDto,
  GroupListQueryDto,
} from '@/modules/lms/groups/dto/group.dto';

@ApiTags('LMS / Groups')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
export class LmsGroupController {
  constructor(private readonly service: LmsGroupService) {}

  @Post('generate-groups')
  @ApiOperation({ summary: 'Generate groups for edu plan (stub)' })
  async generate(@Body() dto: GenerateGroupsDto) {
    return buildSuccess(true, await this.service.generate(dto));
  }

  @Post('detach-workers-in-group')
  @ApiOperation({ summary: 'Detach workers from group (hard delete)' })
  async detachWorkers(@Body() dto: DetachGroupWorkersDto) {
    return buildSuccess(true, await this.service.detachWorkers(dto));
  }

  @Get('groups')
  @ApiOperation({ summary: 'List groups' })
  async list(@Query() q: GroupListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('group-workers')
  @ApiOperation({ summary: 'List group workers (filter: group_id)' })
  async groupWorkers(@Query() q: GroupListQueryDto) {
    return buildSuccess(true, await this.service.groupWorkers(q));
  }

  @Get('protocol')
  @ApiOperation({ summary: 'List LMS protocols' })
  async protocol(@Query() q: GroupListQueryDto) {
    return buildSuccess(true, await this.service.protocol(q));
  }

  @Get('worker-exams')
  @ApiOperation({ summary: 'List worker exams (stub)' })
  async workerExams(@Query() q: GroupListQueryDto) {
    return buildSuccess(true, await this.service.workerExams(q));
  }
}
