<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Log;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Exports\StatementYearCodesExport;
use Modules\Economist\Models\Statement;

class StatementExportByYearWithCodesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;
    protected array|null $codes;
    protected int $year;
    protected string $type;

    public function __construct($task, $user, $query)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
        $this->codes = $query['codes'] ?? [];
        $this->year = $query['year'];
        $this->type = $query['type'];
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);

            if ($this->type === 'code') {
                $statements = Statement::query()
                    ->filter($this->user)
                    ->where('year', $this->year)
                    ->where(function ($q) {
                        foreach ($this->codes as $code) {
                            $q->orWhere("s_$code", '>', 0);
                        }
                    })
                    ->select(array_merge(
                        ['id', 'full_name', 'position', 'organization_id', 'month'],
                        collect($this->codes)->map(fn($c) => "s_$c")->toArray()
                    ))
                    ->with(['organization:id,name'])
                    ->get()
                    ->groupBy('full_name');
            } else {
                $statements = Statement::query()
                    ->filter($this->user)
                    ->where('year', $this->year)
                    ->where("total_four", '>', 0)
                    ->select(['id', 'full_name', 'position', 'organization_id', 'month', 'total_four'])
                    ->with(['organization:id,name'])
                    ->get()
                    ->groupBy('full_name');
            }

            $rows = [];
            foreach ($statements as $workerName => $items) {
                $row = [
                    'full_name' => $workerName,
                    'position' => $items->first()->position,
                    'organization' => $items->first()->organization?->name,
                ];

                if ($this->type === 'code') {
                    foreach ($this->codes as $code) {
                        for ($month = 1; $month <= 12; $month++) {
                            $val = $items->where('month', $month)->sum("s_$code");
                            $row["{$code}_{$month}"] = $val;
                        }
                    }
                } else {
                    for ($month = 1; $month <= 12; $month++) {
                        $row["total_four_{$month}"] = $items->where('month', $month)->sum('total_four');
                    }
                }

                $rows[] = $row;
            }

            $fileName = 'tasks/export/statements/year_' . md5($this->task->id) . '.xlsx';

            Excel::store(
                new StatementYearCodesExport($rows, $this->type, $this->codes),
                $fileName,
                'minio'
            );

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error($e);

            $this->task->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }
}
