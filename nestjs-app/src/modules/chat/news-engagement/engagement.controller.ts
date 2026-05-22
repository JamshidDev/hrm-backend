// News engagement controller.
// Laravel: ChatNewsViewController + ChatNewsReactionController.
// Routes: POST /news/:id/view, POST /news/:id/reaction (auth.hybrid).

import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatNewsEngagementService } from '@/modules/chat/news-engagement/engagement.service';
import { ReactionDto } from '@/modules/chat/news-engagement/dto/engagement.dto';

@ApiTags('Chat / News Engagement')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/news')
export class ChatNewsEngagementController {
  constructor(private readonly service: ChatNewsEngagementService) {}

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark news as viewed (idempotent)' })
  async addView(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.addView(id));
  }

  @Post(':id/reaction')
  @ApiOperation({ summary: 'Like/Dislike news (upsert, counter sync)' })
  async addReaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReactionDto,
  ) {
    return buildSuccess(
      true,
      await this.service.addReaction(id, body.reaction),
    );
  }
}
