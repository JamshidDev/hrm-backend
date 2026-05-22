<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Exports\MultiStatementWorkersExport;
use Modules\Economist\Models\Statement;

class MultipleStatementsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;
    private SupportCollection $rows;

    public function __construct($task, $user, $query)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);

            $multiWorkers = Statement::query()
                ->filter($this->user)
                ->select('pin', 'year', 'month')
                ->where('year', request('year'))
                ->where('month', request('month'))
                ->groupBy('pin', 'year', 'month')
                ->havingRaw('COUNT(DISTINCT organization_id) > 1');

            $data = Statement::query()
                ->filter($this->user)
                ->joinSub($multiWorkers, 'mw', function ($join) {
                    $join->on('statements.pin', '=', 'mw.pin')
                        ->on('statements.year', '=', 'mw.year')
                        ->on('statements.month', '=', 'mw.month');
                })
                ->with(['organization:id,name,code'])
                ->get()
                ->groupBy('pin')
                ->map(function ($group) {
                    $worker = $group->first();
                    return [
                        'full_name' => $worker->full_name,
                        'pin' => $worker->pin,
                        'year' => $group->first()->year,
                        'month' => $group->first()->month,
                        'organizations' => $group->map(fn($s) => [
                            'organization_code' => $s->organization->code,
                            'organization' => $s->organization->name,
                            'position' => $s->position,
                            'salary' => number_format($s->total_four, 2),
                        ]),
                        'total_salary' => number_format($group->sum('total_four'), 2),
                    ];
                });

            $fileName = 'tasks/export/statements/' . md5($this->task->id) . '.xlsx';
            Excel::store(new MultiStatementWorkersExport($data), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e, 'MultipleStatementsJob');
            $this->task->update(['comment' => trans('messages.server_error'), 'status' => ExportJobStatusEnum::ERROR->value]);
        }
    }
}
