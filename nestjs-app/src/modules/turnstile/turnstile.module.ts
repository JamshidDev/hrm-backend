// Turnstile aggregator module. Laravel: Modules/Turnstile (85 routes).
//
// Sub-modules:
//   - BuildingModule              (CRUD: /api/v1/turnstile/buildings)
//   - TerminalModule              (CRUD: /api/v1/turnstile/terminals)
//   - OrganizationTerminalModule  (sync: /api/v1/turnstile/organization-terminals)
//   - TurnstileEnumsModule        (GET /api/v1/turnstile/enums)
//   - WorkDurationModule          (work-duration + terminal-logs)
//   - WorkerPhotoModule           (/api/v1/turnstile/worker-photos)
//   - AccessLevelModule           (/api/v1/turnstile/hik-central/access-levels*)
//   - HcpDeviceModule             (/api/v1/turnstile/hik-central/devices*)
//   - HcpWorkerModule             (/api/v1/turnstile/hik-central/workers*)
//   - EventModule                 (/api/v1/turnstile/hik-central/events*)
//   - SyncModule                  (/api/v1/turnstile/hik-central/sync*)
//   - TelegramModule              (/api/v1/turnstile/hik-central/telegram*)
//   - ApproveAlModule             (/api/v1/turnstile/hik-central/approve-al*)
//   - ScheduleTypeModule          (/api/v1/turnstile/schedule/types*)
//   - ScheduleGroupModule         (/api/v1/turnstile/schedule/schedule-groups*)
//   - WorkerScheduleModule        (/api/v1/turnstile/schedule/workers*, generate*)
//   - ScheduleStatsModule         (/api/v1/turnstile/schedule/stats-*)

import { Module } from '@nestjs/common';

import { BuildingModule } from '@/modules/turnstile/buildings/building.module';
import { TerminalModule } from '@/modules/turnstile/terminals/terminal.module';
import { OrganizationTerminalModule } from '@/modules/turnstile/organization-terminals/organization-terminal.module';
import { TurnstileEnumsModule } from '@/modules/turnstile/enums-endpoint/enums.module';
import { WorkDurationModule } from '@/modules/turnstile/work-duration/work-duration.module';
import { WorkerPhotoModule } from '@/modules/turnstile/worker-photos/worker-photo.module';
import { AccessLevelModule } from '@/modules/turnstile/hik-central-access-levels/access-level.module';
import { HcpDeviceModule } from '@/modules/turnstile/hik-central-devices/hcp-device.module';
import { HcpWorkerModule } from '@/modules/turnstile/hik-central-workers/hcp-worker.module';
import { EventModule } from '@/modules/turnstile/hik-central-events/event.module';
import { SyncModule } from '@/modules/turnstile/hik-central-sync/sync.module';
import { TelegramModule } from '@/modules/turnstile/hik-central-telegram/telegram.module';
import { ApproveAlModule } from '@/modules/turnstile/hik-central-approve-al/approve-al.module';
import { ScheduleTypeModule } from '@/modules/turnstile/schedule-types/schedule-type.module';
import { ScheduleGroupModule } from '@/modules/turnstile/schedule-groups/schedule-group.module';
import { WorkerScheduleModule } from '@/modules/turnstile/worker-schedules/worker-schedule.module';
import { ScheduleStatsModule } from '@/modules/turnstile/schedule-stats/schedule-stats.module';

@Module({
  imports: [
    BuildingModule,
    TerminalModule,
    OrganizationTerminalModule,
    TurnstileEnumsModule,
    WorkDurationModule,
    WorkerPhotoModule,
    AccessLevelModule,
    HcpDeviceModule,
    HcpWorkerModule,
    EventModule,
    SyncModule,
    TelegramModule,
    ApproveAlModule,
    ScheduleTypeModule,
    ScheduleGroupModule,
    WorkerScheduleModule,
    ScheduleStatsModule,
  ],
})
export class TurnstileModule {}
