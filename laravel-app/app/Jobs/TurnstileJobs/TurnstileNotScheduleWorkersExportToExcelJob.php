<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\WorkerPosition;

class TurnstileNotScheduleWorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected array $query;
    protected int $userId;

    public function __construct($query, $task, $userId)
    {
        $this->task = $task;
        $this->query = $query;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        try {
            $user = User::find($this->userId);
            request()->merge($this->query);

            $date = Carbon::parse($request->date ?? now());

            $scheduleData = WorkerPosition::query()
            ->filter($user, $this->query)
                ->when(request('search'), fn ($query) => $query->whereHas('worker', fn ($query) => $query->searchByFullName()))
                ->with([
                    'worker:id,last_name,first_name,middle_name,photo',
                    'organization:id,name,name_ru,name_en,full_name,group',
                    'department:id,name,level',
                    'position:id,name'
                ])
                ->whereDoesntHave('scheduleDays', function ($query) use ($date) {
                    $query->whereDate('date', $date);
                })
                ->get()->map(function ($wp) {
                    $worker = $wp->worker;
                    return [
                        'id' => $wp->id,
                        'last_name' => $worker->last_name,
                        'first_name' => $worker->first_name,
                        'middle_name' => $worker->middle_name,
                        'organization_name' => $wp->organization?->name,
                        'department_name' => $wp->department?->name,
                        'position_name' => $wp->position?->name
                    ];
                });


            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($scheduleData, 'turnstile', [
                'id',
                'last_name',
                'first_name',
                'middle_name',
                'organization_name',
                'department_name',
                'position_name'
            ]), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
