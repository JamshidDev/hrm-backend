<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Log;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Models\Statement;

class StatementExportWithCodesByWorkersJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;
    protected array $codes;

    public function __construct($task, $user, $query)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
        $this->codes = $query['codes'];
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);
            $workers = Statement::query()
                ->filter($this->user)
                ->where(function ($query) {
                    foreach ($this->codes as $code) {
                        $query->orWhere("s_{$code}", '>', 0);
                    }
                })
                ->where('year', request('year'))
                ->where('month', request('month'))
                ->select(array_merge(
                    ['id', 'full_name', 'organization_id', 'position'],
                    collect($this->codes)->map(fn($code) => "s_{$code}")->toArray()
                ))
                ->with(['organization:id,name,code'])
                ->get()
                ->map(function ($statement) {
                    $data = [
                        'full_name'    => $statement->full_name,
                        'position' => $statement->position,
                        'organization' => $statement->organization?->name,
                    ];

                    // 🔑 dynamic code columns
                    foreach ($this->codes as $code) {
                        $data[$code] = $statement->{"s_{$code}"} ?? 0;
                    }

                    return $data;
                })->values()->toArray();

            $fileName = 'tasks/export/statements/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($workers,'worker'), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Exception caught', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->task->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }
}
