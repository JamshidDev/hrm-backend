<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Turnstile\Services\TurnstileService;
use Throwable;

class TurnstileComeWorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected int $userId;
    protected array $query;
    protected array $dontInstallDeviceOrgIds;
    protected array $whiteList;

    public function __construct($task, $query, $userId, $dontInstallDeviceOrgIds, $whiteList)
    {
        $this->task = $task;
        $this->userId = $userId;
        $this->query = $query;
        $this->dontInstallDeviceOrgIds = $dontInstallDeviceOrgIds;
        $this->whiteList = $whiteList;
    }

    public function handle(TurnstileService $service): void
    {
        $user = User::query()->find($this->userId);
        request()->merge($this->query);
        try {
            $date = Carbon::parse(request('date', now()->toDateString()));
            $q = $service->filterQuery($user);
            $allEvents = (bool)($this->query['auth_type'] ?? false);
            if ($allEvents) {
                $query = $service->allEvents($q, $date);
            } else {
                $query = $service->lastEvent($q, $date);
            }
            $workers = $query
                ->when(!$allEvents, fn($query) => $query->distinct('workers.id'))
                ->whereNotNull('te.direction')
                ->when($this->query['auth_type'] ?? null, function ($query, $authType) {
                    if ($authType === 'MobileFaceEvent') {
                        $query->where('te.auth_type', 'MobileFaceEvent');
                    } elseif ($authType === 'ACSEventFaceVerifyPass') {
                        $query->where('te.auth_type', '!=', 'MobileFaceEvent');
                    }
                })
                ->select([
                    'workers.last_name',
                    'workers.first_name',
                    'workers.middle_name',
                    'te.last_event',
                    'te.direction',
                    'o.name as organization_name',
                    'd.name as department_name',
                    'p.name as position_name',
                ])
                ->get()->map(function ($worker) {
                    return [
                        'last_name' => $worker->last_name,
                        'first_name' => $worker->first_name,
                        'middle_name' => $worker->middle_name,
                        'last_event' => $worker->last_event,
                        'direction' => $worker->direction ? 'Kirish' : 'Chiqish',
                        'organization_name' => $worker->organization_name,
                        'department_name' => $worker->department_name,
                        'position_name' => $worker->position_name,
                    ];
                })->values()->toArray();

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($workers, 'turnstile'), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Throwable $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
