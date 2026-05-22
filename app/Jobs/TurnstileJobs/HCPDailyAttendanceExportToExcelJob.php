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
use Modules\Turnstile\Models\TerminalEvent;

class HCPDailyAttendanceExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected array|null $query;
    protected int $userId;

    public function __construct($task, $query, $userId)
    {
        $this->task = $task;
        $this->query = $query;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        request()->merge($this->query);
        $user = User::query()->find($this->userId);
        try {
            $day = request('date', now()->toDateString());
            $events = TerminalEvent::query()
                ->filter($user, $this->query)
                ->whereIn('hik_central_access_level_id', Helper::userAccessLevels($user))
                ->whereDate('event_date_and_time', $day)
                ->when(request('direction'), function ($query, $direction) {
                    $query->where('direction', (int)$direction === 1);
                })
                ->with('worker:id,last_name,first_name,middle_name,photo,birthday')
                ->orderByDesc('event_date_and_time')
                ->whereTime('event_time', '>=', request('start_time', '00:00:00'))
                ->whereTime('event_time', '<=', request('end_time', '23:59:59'))
                ->get()
                ->map(function ($event) {
                    return [
                        'event_date' => $event->event_date,
                        'event_time' => $event->event_time,
                        'device_name' => $event->device_name,
                        'direction' => $event->direction ? 'In' : 'Out',
                        'last_name' => $event->worker->last_name,
                        'first_name' => $event->worker->first_name,
                        'middle_name' => $event->worker->middle_name
                    ];
                })
                ->toArray();

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($events, 'turnstile'), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
