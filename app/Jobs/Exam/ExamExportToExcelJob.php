<?php

namespace App\Jobs\Exam;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Exam\Exports\ExamResultsExport;
use Modules\Exam\Models\WorkerExam;

class ExamExportToExcelJob implements ShouldQueue
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

            $collection = WorkerExam::query()
                ->whereHas('worker', function ($query) {
                    $query->whereHas('positions', function ($query) {
                        $query->filter($this->user);
                    });
                })
                ->whereNotNull('ended')
                ->when(request('search'), function ($query) {
                    $query->whereHas('worker', function ($query) {
                        $query->searchByFullName();
                    });
                })
                ->when(request('topics'), function ($query) {
                    $query->whereIn('topic_id', explode(',', request('topics')));
                })
                ->when(request('exams'), function ($query) {
                    $query->whereIn('exam_id', explode(',', request('exams')));
                })
                ->with([
                    'worker:id,last_name,first_name,middle_name',
                    'exam:id,name,tests_count',
                    'topic:id,name',
                    'worker.position:id,worker_id,organization_id,department_id,position_id',
                    'worker.position.department:id,name,level',
                    'worker.position.position:id,name',
                    'worker.position.organization:id,name,name_ru,name_en,full_name',
                ])
                ->orderBy('worker_id')
                ->get()
                ->map(function ($exam) {
                    static $seen = [];
                    if ($exam->exam->tests_count) {
                        $percent = round(((int)$exam->result / (int)$exam->exam->tests_count) * 100) . '%';
                    } else {
                        $percent = 0;
                    }
                    $workerName = null;
                    $examName = null;
                    $topicName = null;

                    if (!in_array($exam->worker_id, $seen, true)) {
                        $workerName = $exam->worker->full_name();
                        $examName = $exam->exam->name;
                        $topicName = $exam->topic->name;
                        $seen[] = $exam->worker_id;
                    }
                    return [
                        'organization' => $exam->worker->position?->organization?->name,
                        'worker' => $workerName,
                        'exam' => $examName,
                        'topic' => $topicName,
                        'created' => $exam->created,
                        'ended' => $exam->ended,
                        'tests_count' => $exam->exam->tests_count,
                        'result' => $exam->result,
                        'percent' => $percent,
                    ];
                });

            $headers = [
                'organization',
                'worker',
                'exam',
                'topic',
                'created',
                'ended',
                'tests_count',
                'result',
                'percent'
            ];

            $fileName = 'tasks/export/' . md5($this->task->id . time()) . '.xlsx';
            Excel::store(new ExamResultsExport($collection, $headers), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);

        } catch (Exception $e) {
            Helper::setLog($e, 'Exam export failed:');
            $this->task->update([
                'status' => ExportJobStatusEnum::ERROR->value,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
