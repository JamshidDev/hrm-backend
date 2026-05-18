// Topic extras controller. Laravel: Exam/ExamController (positions, workers).

import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TopicExtrasService } from '@/modules/exam/topic-extras/topic-extras.service';

@ApiTags('Exam / Topic Extras')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/topics/:topicId')
export class TopicExtrasController {
  constructor(private readonly service: TopicExtrasService) {}

  @Get('positions')
  @ApiOperation({ summary: 'Positions related to the topic' })
  async positions(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Query() q: any,
  ) {
    return buildSuccess(true, await this.service.positions(topicId, q));
  }

  @Get('workers')
  @ApiOperation({ summary: 'Workers related to the topic' })
  async workers(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Query() q: any,
  ) {
    return buildSuccess(true, await this.service.workers(topicId, q));
  }
}
