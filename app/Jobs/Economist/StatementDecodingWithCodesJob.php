<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Exports\StatementDecodingByMonthExport;

class StatementDecodingWithCodesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;

    protected array $data;

    public function __construct($task, $data)
    {
        $this->task = $task;
        $this->data = $data;
    }

    public function handle(): void
    {
        try {
            $fileName = 'tasks/export/statements/' . md5($this->task->id) . '.xlsx';
            Excel::store(new StatementDecodingByMonthExport($this->data), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e,'Statement decoding with codes job error:');
            $this->task->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }
}
