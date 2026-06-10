// SocketGateway — Laravel `socket-server/server.js` (socket.io) NestJS porti.
// nest-app ICHIDA ishlaydi (alohida server emas), asosiy HTTP server (:8001)ga ulanadi.
//
// PARITY (server.js):
//   - handshake auth: {token, secret} → secret tekshir + token→user (SanctumService)
//   - connection: join(`user_${id}`), presence redis.hset('online_users'), emit 'user:online'
//   - Redis subscribe('notifications') → io.to(`user_${id}`).emit('notification', data)
//   - eventlar: get_online_users, emoji, user:inactive, ping, disconnect → 'user:offline'
//
// Frontend o'zgarmaydi — faqat VITE_SOCKET_URL nest-app hostiga buriladi.

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SanctumService } from '@/modules/auth/sanctum.service';
import { RedisService } from '@/shared/redis/redis.service';

const ONLINE_USERS_HASH = 'online_users';

// socket.data.user shakli (server.js socket.user parity).
interface SocketUser {
  id: number;
  short_name: string | null;
  photo: string | null;
  organization: number | null;
  canReceiveOnlineEvents: boolean;
  type: string;
}

@WebSocketGateway({
  // Port berilmagan → asosiy HTTP serverga (:8001) ulanadi. Path default '/socket.io/'.
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 30000,
  pingInterval: 15000,
  connectTimeout: 60000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SocketGateway.name);
  @WebSocketServer() private server!: Server;

  constructor(
    private readonly config: ConfigService,
    private readonly sanctum: SanctumService,
    private readonly redis: RedisService,
  ) {}

  // socket.data (any) → typed user accessor.
  private userOf(socket: Socket): SocketUser | undefined {
    return (socket.data as { user?: SocketUser }).user;
  }

  afterInit(server: Server): void {
    // 1) Auth middleware (server.js io.use parity).
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((e: Error) => next(e));
    });

    // 2) Redis 'notifications' kanalini eshitish → tegishli userga emit.
    this.redis.createSubscriber('notifications', (message) => {
      try {
        const payload = JSON.parse(message) as {
          userId: number;
          data: Record<string, unknown>;
        };
        server.to(`user_${payload.userId}`).emit('notification', payload.data);
      } catch (e) {
        this.logger.error(`notifications parse xato: ${String(e)}`);
      }
    });
    this.logger.log(
      'SocketGateway init — /socket.io/ + notifications subscribe',
    );
  }

  // server.js io.use — secret + token tekshirib socket.data.user o'rnatadi.
  private async authenticate(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth as {
      token?: string;
      secret?: string;
      type?: string;
    };
    const token = auth.token;
    if (!token) throw new Error('Authentication error: Token required');

    // Socket secret — SOCKET_SECRET o'rnatilgan bo'lsa majburiy (prod parity).
    // Lokalda bo'sh bo'lsa — o'tkazib yuboriladi (dev qulayligi).
    const expected = this.config.get<string>('SOCKET_SECRET', '');
    if (expected && auth.secret !== expected) {
      throw new Error('Invalid socket secret');
    }

    const user = await this.sanctum.verifyToken(token);
    if (!user?.id) throw new Error('Invalid token');

    const sUser: SocketUser = {
      id: user.id,
      short_name: null,
      photo: null,
      organization: user.organization_id ?? null,
      // TODO: can_receive_online_events permission'dan (hozir hammaga true).
      canReceiveOnlineEvents: true,
      type: auth.type ?? 'sanctum',
    };
    (socket.data as { user?: SocketUser }).user = sUser;
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = this.userOf(socket);
    if (!user?.id) {
      socket.disconnect();
      return;
    }

    // Private room (server.js: socket.join(`user_${id}`)).
    await socket.join(`user_${user.id}`);
    if (user.canReceiveOnlineEvents) await socket.join('online_receivers');

    // Presence — Redis hash 'online_users'.
    await this.redis.main.hset(
      ONLINE_USERS_HASH,
      String(user.id),
      JSON.stringify({
        socketId: socket.id,
        id: user.id,
        short_name: user.short_name,
        photo: user.photo,
        organization: user.organization,
        canReceiveOnlineEvents: user.canReceiveOnlineEvents,
        type: user.type,
      }),
    );
    socket.to('online_receivers').emit('user:online', { user });
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const user = this.userOf(socket);
    if (!user?.id) return;
    const raw = await this.redis.main.hget(ONLINE_USERS_HASH, String(user.id));
    if (!raw) return;
    const current = JSON.parse(raw) as { socketId: string };
    // Faqat shu socket online yozuvi bo'lsa o'chiramiz (server.js parity).
    if (current.socketId === socket.id) {
      await this.redis.main.hdel(ONLINE_USERS_HASH, String(user.id));
      socket.broadcast.emit('user:offline', { user });
    }
  }

  // server.js: get_online_users — Redis hash → ro'yxat (faqat shu socketga).
  @SubscribeMessage('get_online_users')
  async onGetOnlineUsers(socket: Socket): Promise<void> {
    const user = this.userOf(socket);
    if (!user?.canReceiveOnlineEvents) {
      socket.emit('online_users', []);
      return;
    }
    const all = await this.redis.main.hgetall(ONLINE_USERS_HASH);
    const list = Object.values(all).map((s) => JSON.parse(s) as unknown);
    // TODO: users-photos bilan foto yangilash (server.js callback).
    socket.emit('online_users', list);
  }

  // server.js: emoji relay (toUserId room) — batch log keyin qo'shiladi.
  @SubscribeMessage('emoji')
  onEmoji(socket: Socket, data: { toUserId: number; emoji: string }): void {
    const user = this.userOf(socket);
    if (!user) return;
    this.server.to(`user_${data.toUserId}`).emit('emoji', {
      emoji: data.emoji,
      fromUserId: user.id,
      shortName: user.short_name,
    });
    // TODO: emojiBuffer 30-batch → POST /api/v1/chat/emoji.
  }

  @SubscribeMessage('user:inactive')
  async onInactive(socket: Socket): Promise<void> {
    const user = this.userOf(socket);
    if (!user) return;
    await this.redis.main.hdel(ONLINE_USERS_HASH, String(user.id));
    socket.broadcast.emit('user:offline', { user });
  }

  @SubscribeMessage('ping')
  onPing(_socket: Socket, _data: unknown, cb?: (v: string) => void): void {
    if (typeof cb === 'function') cb('pong');
  }
}
