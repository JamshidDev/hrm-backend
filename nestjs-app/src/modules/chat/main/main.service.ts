// Chat module enums. Laravel: ChatController->enums.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RequestContext } from '@/common/context/request.context';

// Laravel App\Enums\TelegramMessageTypeEnum::list() — [{id, name}] (i18n label).
const TELEGRAM_TYPE_LABELS: Record<number, string> = {
  1: 'messages.chat.telegram.messages.types.birthday',
  2: 'messages.chat.telegram.messages.types.vacations',
  3: 'messages.chat.telegram.messages.types.med',
  4: 'messages.chat.telegram.messages.types.passport',
  5: 'messages.chat.telegram.messages.types.mobile_app',
  6: 'messages.chat.telegram.messages.types.turnstile_stats',
};

@Injectable()
export class ChatMainService {
  constructor(
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  /** GET /api/v1/chat/enums — frontend dropdownlar uchun. */
  enums() {
    const lang = this.ctx.lang;
    return {
      telegram_message_types: Object.entries(TELEGRAM_TYPE_LABELS).map(
        ([id, key]) => {
          const v = this.i18n.t(key, { lang });
          return { id: Number(id), name: typeof v === 'string' ? v : '' };
        },
      ),
    };
  }
}
