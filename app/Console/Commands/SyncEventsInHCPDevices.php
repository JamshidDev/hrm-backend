<?php

namespace App\Console\Commands;

use App\Jobs\HCP\SyncEventsInDevicesHCPOptimizedJob;
use App\Services\HikCentralService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Modules\Turnstile\Enums\SyncTypeEnum;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\SyncHCPAccessLog;
use Modules\Turnstile\Models\SyncOfflineDevice;

class SyncEventsInHCPDevices extends Command
{
    protected $signature = 'hcp:sync-events';
    protected $description = 'Update events from HCP every 10 minutes';

    public function handle(): void
    {
        Cache::forget('sync_events_hcp_lock');

        new HikCentralService()->devices();

        $syncHCPAccessLog = SyncHCPAccessLog::query()
            ->create([
                'user_id' => 1,
                'type' => SyncTypeEnum::ONE->value,
                'sync_datetime' => now()
            ]);

        $syncId = $syncHCPAccessLog->id;
        $userOfflineDevices = HCPDevice::query()
            ->where('status', false)
            ->get()
            ->map(function ($item) use ($syncId) {
                return [
                    'sync_h_c_p_access_log_id' => $syncId,
                    'hik_central_device_id' => $item->device_id,
                    'name' => $item->name,
                ];
            })->values()->toArray();

        SyncOfflineDevice::query()->insert($userOfflineDevices);
        SyncEventsInDevicesHCPOptimizedJob::dispatch($syncHCPAccessLog);
    }
}
