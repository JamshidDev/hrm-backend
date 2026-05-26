import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [HikCentralClient],
  exports: [HikCentralClient],
})
export class HikCentralModule {}
