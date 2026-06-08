// Global Redis modul — RedisService hamma joyda inject bo'ladi.
import { Global, Module } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
