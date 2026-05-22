<?php

namespace App\Jobs\HR;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Models\WorkerRelative;
use Throwable;

class WorkerRelativesExportJob implements ShouldQueue
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
        try {
            $workerIds = WorkerPosition::query()
                ->filter($this->user)
                ->select('worker_id');

            $query = WorkerRelative::query()
                ->whereIn('worker_id', $workerIds)
                ->get()
                ->map(function ($e) {
                    return [
                        'full_name' => $e->worker->full_name(),
                        'pin' => $e->worker->pin,
                        'relative' => RelativeEnum::get($e->relative, 'uz'),
                        'last_name' => $e->last_name,
                        'first_name' => $e->first_name,
                        'middle_name' => $e->middle_name,
                        'birthday' => $e->birthday,
                        'birth_place' => $e->birth_place,
                        'post_name' => $e->post_name,
                        'address' => $e->address
                    ];
                })
                ->values()
                ->toArray();

            $fileName = 'tasks/export/relatives/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($query, 'worker'), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Throwable $e) {
            Helper::setLog($e,'WorkerRelativesExportJob');
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $e->getMessage()]);
        }
    }
}
