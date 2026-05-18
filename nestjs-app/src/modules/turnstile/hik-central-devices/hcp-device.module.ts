import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { HcpDeviceController } from '@/modules/turnstile/hik-central-devices/hcp-device.controller';
import { HcpDeviceService } from '@/modules/turnstile/hik-central-devices/hcp-device.service';

@Module({
  imports: [AuthModule],
  controllers: [HcpDeviceController],
  providers: [HcpDeviceService],
})
export class HcpDeviceModule {}
