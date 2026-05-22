// Chat module enums. Laravel: ChatController->enums.

import { Injectable } from '@nestjs/common';

/**
 * Telegram xabar turlari — Laravel `TelegramMessageTypeEnum`.
 * Backend yuborgan xabar turlari uchun (notification, bot reply, va h.k.).
 */
const TELEGRAM_MESSAGE_TYPES = [
  { id: 1, type: 'General' },
  { id: 2, type: 'Notification' },
  { id: 3, type: 'System' },
];

@Injectable()
export class ChatMainService {
  /** GET /api/v1/chat/enums — frontend dropdownlar uchun. */
  enums() {
    return {
      telegram_message_types: TELEGRAM_MESSAGE_TYPES,
    };
  }
}
