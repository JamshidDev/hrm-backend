<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Turnstile\Models\HCPDevice;

class HCPDevicesStatusesExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected int $userId;

    public function __construct($task, $userId)
    {
        $this->task = $task;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        $user = User::find($this->userId);
        try {
            $devices = HCPDevice::query()
                ->filter($user, [])
                ->with(['organization:id,name'])
                ->get()
                ->map(function ($device) {
                    return [
                        'name' => $device->organization->name . ' - ' . $device->name,
                        'area_name' => $device->name,
                        'status' => $device->status ? 'On' : 'Off',
                        'serial_number' => $device->serial_number ?? ''
                    ];
                })
                ->values()
                ->toArray();

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            $columns = ['organization_name', 'area_name', 'status', 'serial_number'];
            Excel::store(new DynamicExportFromArray($devices, 'turnstile.devices', $columns), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
