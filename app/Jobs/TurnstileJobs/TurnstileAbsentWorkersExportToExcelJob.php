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
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;

class TurnstileAbsentWorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;
    protected array $query;
    protected int $userId;
    protected array $whiteList;

    public function __construct($task, $query, $userId, $whiteList)
    {
        $this->task = $task;
        $this->query = $query;
        $this->userId = $userId;
        $this->whiteList = $whiteList;
    }

    public function handle(): void
    {
        try {
            $user = User::findOrFail($this->userId);
            request()->merge($this->query);

            $date = Carbon::parse(request('date') ?? now());
            $today = $date->copy()->toDateString();

            $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
            $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

            $subQuery = DB::table('workers as w')
                ->whereIn('w.id', WorkerPosition::filter($user, $this->query)->select('worker_id'))
                ->whereNotIn('w.id', $this->whiteList)
                ->leftJoin('worker_positions as wp', 'w.id', '=', 'wp.worker_id')
                ->where('wp.is_turnstile', true)
                ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
                ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
                ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
                ->leftJoin('turnstile_worker_schedules as st', function ($join) use ($today) {
                    $join->on('w.id', '=', 'st.worker_id')
                        ->whereDate('st.date', '=', $today);
                })
                ->leftJoin('terminal_events as te', function ($join) use ($startOfDay, $endOfDay) {
                    $join->on('w.id', '=', 'te.worker_id')
                        ->where('te.event_date_and_time', '>=', $startOfDay)
                        ->where('te.event_date_and_time', '<', $endOfDay);
                })
                ->leftJoin('vacations as v', function ($join) use ($today) {
                    $join->on('w.id', '=', 'v.worker_id')
                        ->whereDate('v.from', '<=', $today)
                        ->whereDate('v.to', '>=', $today)
                        ->whereNull('v.deleted_at');
                })
                ->whereNull('w.deleted_at')
                ->whereNull('v.worker_id')
                ->select(
                    'w.id as worker_id',
                    'w.last_name',
                    'w.first_name',
                    'w.middle_name',
                    'o.name as organization_name',
                    'd.name as department_name',
                    'p.name as position_name',
                    DB::raw("
                     CASE
                        WHEN st.worker_id IS NOT NULL
                             AND NOW() >= (st.date + st.start_time::interval)
                             AND te.worker_id IS NULL
                        THEN 'scheduled_absent'

                        WHEN st.worker_id IS NULL
                             AND te.worker_id IS NULL
                             AND EXTRACT(ISODOW FROM NOW()) NOT IN (6,7)
                        THEN 'no_schedule_absent'

                        ELSE 'present'
                    END as status
                ")
                )
                ->distinct('worker_id');

            $allWorkers = DB::table(DB::raw("({$subQuery->toSql()}) as sub"))
                ->mergeBindings($subQuery)
                ->whereIn('status', ['no_schedule_absent', 'scheduled_absent']);
            $data = $allWorkers->get();
            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromCollection($data, 'turnstile', [
                'id',
                'last_name',
                'first_name',
                'middle_name',
                'organization_name',
                'department_name',
                'position_name',
                'status'
            ]), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
