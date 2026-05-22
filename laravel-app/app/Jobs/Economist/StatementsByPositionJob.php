<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Exports\StatementsByPositionExport;
use Modules\HR\Models\WorkerPosition;

class StatementsByPositionJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected array $query;

    protected UserExportTask $task;

    protected User $user;

    public function __construct($query, $task, $user)
    {
        $this->query = $query;
        $this->task = $task;
        $this->user = $user;
    }


    public function handle(): void
    {
        request()->merge($this->query);
        $date = request('year', date('Y'));
        try {
            $fileName = 'tasks/export/economist/' . md5($this->task->id) . '.xlsx';
            Excel::store(new StatementsByPositionExport($this->user, $date), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (\Throwable $e) {
            Helper::setLog($e,'StatementsByPositionJob:');
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $e->getMessage()]);
        }
    }
}
