<?php

namespace App\Jobs\Exam;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Log;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Exam\Exports\ExamResultsExport;
use Modules\HR\Models\WorkerPosition;

class NotPassedExamWorkersExportToExcelJob implements ShouldQueue
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

            $collection = WorkerPosition::query()
                ->filter($this->user)
                ->whereHas('worker', function ($query) {
                    $query->whereDoesntHave('exams', function ($query) {
                        $query
                            ->when(request('topics'), function ($query) {
                                $query->whereIn('topic_id', explode(',', request('topics')));
                            })->when(request('exams'), function ($query) {
                                $query->whereIn('exam_id', explode(',', request('exams')));
                            });
                    });
                })
                ->with([
                    'worker:id,last_name,first_name,middle_name',
                    'position:id,name',
                    'organization:id,name,name_en,name_ru,full_name',
                    'department:id,name,level',
                ])
                ->get()
                ->map(function ($worker) {
                    return [
                        'worker' => $worker->worker->full_name(),
                        'oragnization' => $worker->organization->name,
                        'position' => PositionHelper::getShortPosition($worker)
                    ];
                });

            $headers = [
                'worker',
                'organization',
                'position'
            ];

            $fileName = 'tasks/export/' . md5($this->task->id . time()) . '.xlsx';
            Excel::store(new ExamResultsExport($collection, $headers), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);

        } catch (Exception $e) {
            Log::error('Exception caught', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->task->update([
                'status' => ExportJobStatusEnum::ERROR->value,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
