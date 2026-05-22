// Chat user emoji controller. Laravel: UserEmojiController.
// Public (Laravel: socket-server-api middleware).

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ChatUserEmojiService } from '@/modules/chat/user-emoji/user-emoji.service';
import { SendEmojiBatchDto } from '@/modules/chat/user-emoji/dto/emoji.dto';

@ApiTags('Chat / Emoji')
@Controller('api/v1/chat/emoji')
export class ChatUserEmojiController {
  constructor(private readonly service: ChatUserEmojiService) {}

  /**
   * POST /chat/emoji — socket server'dan emoji burst batch.
   * Laravel: response()->json(['ok' => true]) — Helper::response wrap qilinmagan.
   */
  @Public()
  @Post()
  @ApiOperation({ summary: 'Batch insert emoji from socket server' })
  async send(@Body() dto: SendEmojiBatchDto) {
    return this.service.send(dto);
  }
}
