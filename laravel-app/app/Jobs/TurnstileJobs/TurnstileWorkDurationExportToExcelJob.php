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
use Modules\Turnstile\Http\Controllers\DashboardPreviewController;
use Modules\Turnstile\Services\TurnstileService;

class TurnstileWorkDurationExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;

    public function __construct($task, $query, $user)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
    }

    public function handle(TurnstileService $service): void
    {
        request()->merge($this->query);
        try {
            $date = request('date', now()->toDateString());
            $normHours = request('norm_hours', 8);
            $normMinutes = $normHours * 60;

            $query = $service->filterQuery($this->user);

            $workers = new DashboardPreviewController()
                ->workDurationsSql($query, $date)
                ->select([
                    'workers.last_name',
                    'workers.first_name',
                    'workers.middle_name',
                    'work_times.total_minutes',
                    'o.name as organization_name',
                    'd.name as department_name',
                    'p.name as position_name',
                ]);

            if (request('status') === 'max') {
                $workers = $workers->where(function ($query) use ($normMinutes) {
                    $query->where('work_times.total_minutes', '>', $normMinutes);
                })->whereNotNull('work_times.total_minutes')
                    ->orderByDesc('work_times.total_minutes');
            } else {
                $workers = $workers->where(function ($query) use ($normMinutes) {
                    $query->where('work_times.total_minutes', '>', $normMinutes)
                        ->orWhereNull('work_times.total_minutes');
                })->orderBy('work_times.total_minutes');
            }

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($workers->get(), 'turnstile'), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
