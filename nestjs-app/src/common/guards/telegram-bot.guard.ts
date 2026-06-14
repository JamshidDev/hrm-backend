// Laravel TelegramMiddleware parity — Bot-Token header config token'ga teng bo'lishi
// shart, aks holda 401 { message: 'Unauthorized.' }.
//   $token = header('Bot-Token') ?? input('bot_token');
//   if (!$token || $token !== config('services.telegram.bot_token')) → 401
// Lokal: TELEGRAM_BOT_TOKEN unset → har doim 401 (Laravel bilan mos).

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';

@Injectable()
export class TelegramBotGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token =
      (req.headers['bot-token'] as string | undefined) ??
      (req.body as { bot_token?: string } | undefined)?.bot_token ??
      (req.query as { bot_token?: string } | undefined)?.bot_token;
    const expected = this.config.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token || !expected || token !== expected) {
      throw new RawHttpException(401, { message: 'Unauthorized.' });
    }
    return true;
  }
}
