// LMS main controller — Laravel: LMSController.
// GET /api/v1/lms/enums, /learning-centers, /list/{directions,specializations,edu-plans,groups}.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsMainService } from '@/modules/lms/main/main.service';

@ApiTags('LMS / Main')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
export class LmsMainController {
  constructor(private readonly service: LmsMainService) {}

  @Get('enums')
  @ApiOperation({ summary: 'LMS module enums (types, statuses)' })
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get('learning-centers')
  @ApiOperation({ summary: 'List learning centers (stub)' })
  async learningCenters() {
    return buildSuccess(true, await this.service.learningCenters());
  }

  @Get('list/directions')
  @ApiOperation({ summary: 'List directions (brief: id, name)' })
  async listDirections() {
    return buildSuccess(true, await this.service.listDirections());
  }

  @Get('list/specializations')
  @ApiOperation({ summary: 'List specializations (brief: id, name)' })
  async listSpecializations() {
    return buildSuccess(true, await this.service.listSpecializations());
  }

  @Get('list/edu-plans')
  @ApiOperation({ summary: 'List edu plans (brief: id, name)' })
  async listEduPlans() {
    return buildSuccess(true, await this.service.listEduPlans());
  }

  @Get('list/groups')
  @ApiOperation({ summary: 'List groups (stub)' })
  async listGroups() {
    return buildSuccess(true, await this.service.listGroups());
  }
}
