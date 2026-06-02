// LMS main controller — Laravel: LMSController.
// GET /api/v1/lms/enums, /learning-centers, /list/{directions,specializations,edu-plans,groups}.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsMainService } from '@/modules/lms/main/main.service';
import { LmsListQueryDto } from '@/modules/lms/main/dto/list.dto';

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
  @ApiOperation({
    summary: 'List directions (paginated: id, name, name_ru, name_en)',
  })
  async listDirections(@Query() q: LmsListQueryDto) {
    return buildSuccess(true, await this.service.listDirections(q));
  }

  @Get('list/specializations')
  @ApiOperation({ summary: 'List specializations (paginated + direction)' })
  async listSpecializations(@Query() q: LmsListQueryDto) {
    return buildSuccess(true, await this.service.listSpecializations(q));
  }

  @Get('list/edu-plans')
  @ApiOperation({
    summary: 'List edu plans (paginated, learning-center filtered)',
  })
  async listEduPlans(@Query() q: LmsListQueryDto) {
    return buildSuccess(true, await this.service.listEduPlans(q));
  }

  @Get('list/groups')
  @ApiOperation({ summary: 'List groups (paginated: id, code, workers)' })
  async listGroups(@Query() q: LmsListQueryDto) {
    return buildSuccess(true, await this.service.listGroups(q));
  }
}
