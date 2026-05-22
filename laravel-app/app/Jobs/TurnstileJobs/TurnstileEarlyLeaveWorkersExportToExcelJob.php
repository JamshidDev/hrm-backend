<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromCollection;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class TurnstileEarlyLeaveWorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;

    protected int $userId;
    protected array $query;
    protected array $whiteList;

    public function __construct($task, $query, $userId, $whiteList = [])
    {
        $this->task = $task;
        $this->userId = $userId;
        $this->query = $query;
        $this->whiteList = $whiteList;
    }

    public function handle(): void
    {
        try {
            $user = User::findOrFail($this->userId);
            request()->merge($this->query);
            $date = Carbon::parse(request('date', now()->toDateString()));
            $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
            $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

            $query = TurnstileWorkerSchedule::query()
                ->selectRaw("
                    turnstile_worker_schedules.worker_id,
                    w.first_name,
                    w.last_name,
                    w.middle_name,
                    w.photo,
                    wp.position_id,
                    p.name as position_name,
                    d.name as department_name,
                    o.name as organization_name,
                    turnstile_worker_schedules.end_time,
                    te_last.event_date_and_time as last_exit_time,
                    EXTRACT(EPOCH FROM (turnstile_worker_schedules.end_time - te_last.event_date_and_time::time)) / 60 as early_minutes
                ")
                ->join('workers as w', 'turnstile_worker_schedules.worker_id', '=', 'w.id')
                ->whereNotIn('w.id', $this->whiteList)
                ->leftJoin('worker_positions as wp', function ($join) use ($user) {
                    $join->on('turnstile_worker_schedules.worker_position_id', '=', 'wp.id')
                        ->whereIn('wp.id', WorkerPosition::filter($user, $this->query)->select('id'));
                })
                ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
                ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
                ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
                ->join(DB::raw('LATERAL (
                        SELECT te.event_date_and_time, te.direction
                        FROM terminal_events te
                        WHERE te.worker_id = turnstile_worker_schedules.worker_id
                        AND te.deleted_at IS NULL
                        AND te.event_date_and_time >= \'' . $startOfDay . '\'
                        AND te.event_date_and_time < \'' . $endOfDay . '\'
                        ORDER BY te.event_date_and_time DESC
                        LIMIT 1
                    ) as te_last'), function ($join) {
                    $join->where('te_last.direction', '=', false);
                })
                ->whereIn('turnstile_worker_schedules.worker_position_id', function ($subquery) use ($user) {
                    $subquery->select('id')
                        ->from('worker_positions')
                        ->whereIn('id', WorkerPosition::filter($user, $this->query)->search()->select('worker_position_id'))
                        ->whereNotNull('worker_id');
                })
                ->where('turnstile_worker_schedules.date', $date)
                ->whereNotNull('turnstile_worker_schedules.end_time')
                ->where('turnstile_worker_schedules.work_status', 1)
                ->whereRaw("te_last.event_date_and_time::time < turnstile_worker_schedules.end_time")
                ->groupBy(
                    'turnstile_worker_schedules.worker_id',
                    'w.first_name',
                    'w.last_name',
                    'w.middle_name',
                    'w.photo',
                    'wp.position_id',
                    'p.name',
                    'd.name',
                    'o.name',
                    'turnstile_worker_schedules.end_time',
                    'te_last.event_date_and_time'
                )
                ->orderBy('early_minutes', 'desc')
                ->orderBy('w.last_name')
                ->orderBy('w.first_name')
                ->get()->map(function ($item) {
                    return [
                        'last_name' => $item->last_name,
                        'first_name' => $item->first_name,
                        'middle_name' => $item->middle_name,
                        'end_time' => $item->end_time,
                        'last_exit_time' => $item->last_exit_time,
                        'minutes' => round($item->early_minutes),
                        'organization_name' => $item->organization_name,
                        'department_name' => $item->department_name,
                        'position_name' => $item->position_name,
                    ];
                });

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($query, 'turnstile', [
                'last_name',
                'first_name',
                'middle_name',
                'end_time',
                'last_exit_time',
                'early_minutes',
                'organization_name',
                'department_name',
                'position_name',
            ]), $fileName, 'minio');

            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value,]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
