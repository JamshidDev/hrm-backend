// Redis service — socket presence + pub/sub.
// Laravel socket-server (server.js) bilan PARITY:
//   - Notification kanali: 'notifications' (Redis::publish('notifications', {userId, data}))
//   - Presence: hash 'online_users', db = SOCKET_REDIS_DB (default 2)
//   - Pub/Sub kanal nomi GLOBAL (db-scoped emas), prefix yo'q (Laravel prefix='').
//
// MUHIM: subscribe uchun alohida ulanish kerak (subscriber rejimda boshqa
// buyruq yuborib bo'lmaydi) — `createSubscriber()` duplicate qaytaradi.

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  // Asosiy ulanish — presence (hset/hget/...) + publish.
  private client!: Redis;
  // subscribe uchun ochilgan duplicate'lar (toza yopish uchun).
  private readonly subscribers: Redis[] = [];

  constructor(private readonly config: ConfigService) {}

  private buildOptions(): RedisOptions {
    const pw = this.config.get<string>('REDIS_PASSWORD');
    // Laravel .env'da `null` (string) yoki bo'sh = parolsiz.
    const password = pw && pw !== 'null' && pw !== '' ? pw : undefined;
    return {
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(this.config.get<string>('REDIS_PORT', '6379')),
      // Presence socket-server bilan bir xil db'da bo'lishi SHART.
      db: Number(this.config.get<string>('SOCKET_REDIS_DB', '2')),
      password,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      keepAlive: 30000,
    };
  }

  onModuleInit(): void {
    this.client = new Redis(this.buildOptions());
    this.client.on('error', (e) =>
      this.logger.error(`Redis client xato: ${e.message}`),
    );
    this.client.on('connect', () => this.logger.log('Redis ulandi'));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.client?.quit(),
      ...this.subscribers.map((s) => s.quit()),
    ]);
  }

  /** Asosiy client (presence buyruqlari uchun). */
  get main(): Redis {
    return this.client;
  }

  /**
   * Subscribe uchun alohida ulanish ochadi va kanalga obuna bo'ladi.
   * Laravel parity: subscriber.subscribe('notifications').
   */
  createSubscriber(
    channel: string,
    onMessage: (message: string) => void,
  ): Redis {
    const sub = new Redis(this.buildOptions());
    this.subscribers.push(sub);
    sub.on('error', (e) =>
      this.logger.error(`Redis subscriber xato: ${e.message}`),
    );
    void sub.subscribe(channel, (err) => {
      if (err) this.logger.error(`subscribe(${channel}) xato: ${err.message}`);
      else this.logger.log(`Redis subscribe: ${channel}`);
    });
    sub.on('message', (_ch, msg) => onMessage(msg));
    return sub;
  }

  /**
   * Notification socket kanaliga publish — Laravel SocketChannel::send parity.
   * Redis::publish('notifications', json({userId, data})).
   */
  async publishNotification(
    userId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const msg = JSON.stringify({ userId, data });
    await this.client.publish('notifications', msg);
  }
}
