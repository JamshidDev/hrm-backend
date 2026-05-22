// AI OpenAI controller. Laravel: OpenAIController.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { AiService } from '@/modules/ai/ai.service';
import {
  AiHistoryQueryDto,
  AiLawyerDto,
  AiLikeDto,
  AiQuestionsByDateDto,
} from '@/modules/ai/dto/ai.dto';

@ApiTags('AI / OpenAI')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly service: AiService,
    private readonly i18n: I18nService,
  ) {}

  @Post('lawyer')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI lawyer Q&A (stub — Laravel: streamed)' })
  async lawyer(@Body() dto: AiLawyerDto) {
    return buildSuccess(true, await this.service.lawyer(dto));
  }

  @Get('list')
  @ApiOperation({ summary: 'My AI questions grouped by date' })
  async list(@Query() q: AiHistoryQueryDto) {
    return buildSuccess(true, await this.service.groupedHistory(q));
  }

  @Get('questions')
  @ApiOperation({ summary: 'AI questions by date' })
  async questions(@Query() q: AiQuestionsByDateDto) {
    return buildSuccess(true, await this.service.questionsByDate(q));
  }

  @Post('questions/:id/like')
  @HttpCode(200)
  @ApiOperation({ summary: 'Like/dislike AI answer' })
  async like(@Param('id', ParseIntPipe) id: number, @Body() dto: AiLikeDto) {
    await this.service.likeDislike(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_liked'), []);
  }
}
