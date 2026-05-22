<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Turnstile\Models\HikCentralAccessLevelDevice;
use Modules\Turnstile\Models\HikCentralDevice;

class HCPDevicesExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected array|null $accessLevelIds;
    protected User $user;

    public function __construct($task, $accessLevelIds, $user)
    {
        $this->task = $task;
        $this->accessLevelIds = $accessLevelIds;
        $this->user = $user;
    }

    public function handle(): void
    {
        try {
            $deviceIds = HikCentralAccessLevelDevice::query()
                ->when($this->accessLevelIds, function ($query) {
                    $query->whereIn('hik_central_access_level_id', $this->accessLevelIds);
                })
                ->select('hik_central_device_id');
            $devices = HikCentralDevice::query()
                ->whereIn('id', $deviceIds)
                ->select('name', 'area_name', 'last_sync')
                ->get();
            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            $columns = ['name', 'area_name', 'last_sync'];
            Excel::store(new DynamicExportFromCollection($devices, 'turnstile.devices', $columns), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
