<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Log;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Turnstile\Exports\LateCommersExport;
use Modules\Turnstile\Models\TerminalLog;

class TurnstileExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected array $query;

    protected UserExportTask $task;
    protected User $user;

    public function __construct($task, $query, $user)
    {
        $this->task = $task;
        $this->query = $query;
        $this->user = $user;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);

            $collection = TerminalLog::query()
                ->when(request('search'), function ($query) {
                    $query->whereHas('worker', function ($query) {
                        $query->searchByFullName();
                    });
                })
                ->firstEntries($this->user)
                ->get()->map(function ($log) {
                    return [
                        'worker' => $log->worker->full_name(),
                        'worker_position' => PositionHelper::getShortPosition($log->worker_position),
                        'terminal' => $log->terminal->building->name . '(' . $log->terminal->name . ')',
                        'organization' => $log->worker_position->organization->name,
                        'event_time' => $log->event_time,
                        'event_type' => $log->event_type
                            ? trans('messages.export.event_types.in')
                            : trans('messages.export.event_types.out'),
                    ];
                });

            $headers = [
                'worker',
                'worker_position',
                'organization',
                'terminal',
                'event_time',
                'event_type'
            ];

            $fileName = 'tasks/export/' . md5($this->task->id . time()) . '.xlsx';
            Excel::store(new LateCommersExport($collection, $headers), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);

        } catch (Exception $e) {
            $errMsg = $e->getMessage() . ' ' . $e->getFile() . ' ' . $e->getLine();

            Log::error($errMsg);

            $this->task->update([
                'status' => ExportJobStatusEnum::ERROR->value,
                'error' => $errMsg,
            ]);
        }
    }
}
