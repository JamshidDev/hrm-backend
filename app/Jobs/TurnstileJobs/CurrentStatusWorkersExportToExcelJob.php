<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Turnstile\Http\Controllers\DashboardPreviewController;
use Modules\Turnstile\Services\TurnstileService;
use Throwable;

class CurrentStatusWorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected int $userId;
    protected array $query;
    protected bool $bool;

    public function __construct($task, $query, $userId, $bool)
    {
        $this->task = $task;
        $this->userId = $userId;
        $this->query = $query;
        $this->bool = $bool;
    }

    public function handle(TurnstileService $service): void
    {
        $user = User::query()->find($this->userId);
        request()->merge($this->query);
        try {
            $date = Carbon::parse(request('date', now()->toDateString()));

            $q = $service->filterQuery($user);
            $query = $service->lastEvent($q, $date);

            $workers = $query->distinct('workers.id')
                ->where('te.direction', $this->bool)
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
                ->get();

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($workers, 'turnstile'), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Throwable $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
            throw $e;
        }
    }
}
