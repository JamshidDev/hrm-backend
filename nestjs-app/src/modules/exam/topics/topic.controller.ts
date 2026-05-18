// Topic controller. Laravel: Exam/TopicController.

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
import { TopicService } from '@/modules/exam/topics/topic.service';
import {
  CreateTopicDto,
  QueryTopicDto,
  UpdateTopicDto,
} from '@/modules/exam/topics/dto/topic.dto';

@ApiTags('Exam / Topics')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam')
export class TopicController {
  constructor(
    private readonly service: TopicService,
    private readonly i18n: I18nService,
  ) {}

  @Get('topics')
  @ApiOperation({ summary: 'List exam topics (paginated)' })
  async list(@Query() q: QueryTopicDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  // Frontend dropdown'lari uchun paginatsiya bilan ro'yxat.
  @Get('filter/topics')
  @ApiOperation({ summary: 'Topics list (paginated) for filter dropdowns' })
  async filter(@Query() q: QueryTopicDto) {
    return buildSuccess(true, await this.service.filter(q));
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Get a single topic by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('topics')
  @ApiOperation({ summary: 'Create a topic' })
  async store(@Body() dto: CreateTopicDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }

  @Put('topics/:id')
  @ApiOperation({ summary: 'Update a topic' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete('topics/:id')
  @ApiOperation({ summary: 'Soft-delete a topic' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }
}
