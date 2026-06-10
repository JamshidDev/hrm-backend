// SocketModule — socket.io Gateway (nest-app ichida, alohida server emas).
// SanctumService handshake auth uchun (AuthModule), RedisService global.
import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { SocketGateway } from '@/modules/socket/socket.gateway';

@Module({
  imports: [AuthModule],
  providers: [SocketGateway],
})
export class SocketModule {}
