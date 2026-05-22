<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\WorkerPosition;
use Throwable;

class TurnstileAbsentWorkersInRangeExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;

    protected int $userId;
    protected array $filters;

    public function __construct($filters, $task, $userId)
    {
        $this->task = $task;
        $this->userId = $userId;
        $this->filters = $filters;
    }

    public function handle(): void
    {
        try {
            $user = User::query()->findOrFail($this->userId);
            $filters = $this->filters;
            $fromDate = Carbon::parse($filters['from_date'] ?? now()->toDateString())->toDateString();
            $toDate = Carbon::parse($filters['to_date'] ?? now()->toDateString())->toDateString();

            $workerPositions = WorkerPosition::query()
                ->filter($user, $filters)
                ->where('is_turnstile', true)
                ->select('id');

            $data = DB::table('turnstile_worker_schedules as st')
                ->join('workers as w', 'w.id', '=', 'st.worker_id')
                ->join('worker_positions as wp', 'wp.id', '=', 'st.worker_position_id')
                ->leftJoin('organizations as o', 'o.id', '=', 'wp.organization_id')
                ->leftJoin('positions as p', 'p.id', '=', 'wp.position_id')
                ->whereIn('st.worker_position_id', $workerPositions)
                ->whereBetween('st.date', [$fromDate, $toDate])
                ->where('st.work_status', 1)
                ->whereNotNull('st.start_time')
                ->where('st.start_time', '<>', '00:00:00')
                ->whereNull('st.deleted_at')
                ->whereNull('w.deleted_at')
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('terminal_events as te')
                        ->whereColumn('te.worker_id', 'st.worker_id')
                        ->whereRaw('te.event_date_and_time >= st.date')
                        ->whereRaw("te.event_date_and_time < st.date + INTERVAL '1 day'")
                        ->whereNull('te.deleted_at');
                })
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('vacations as v')
                        ->whereColumn('v.worker_id', 'st.worker_id')
                        ->whereRaw('v.from <= st.date')
                        ->whereRaw('v.to >= st.date')
                        ->whereNull('v.deleted_at');
                })
                ->groupBy(
                    'w.id',
                    'o.name',
                    'w.last_name',
                    'w.first_name',
                    'w.middle_name',
                    'p.name'
                )
                ->selectRaw("
                    o.name as organization_name,
                    CONCAT_WS(' ', w.last_name, w.first_name, w.middle_name) as full_name,
                    p.name as position_name,
                    COUNT(DISTINCT st.date) as absent_count,
                    STRING_AGG(DISTINCT TO_CHAR(st.date, 'YYYY-MM-DD'), ', ' ORDER BY TO_CHAR(st.date, 'YYYY-MM-DD')) as absent_days
                ")
                ->orderByDesc('absent_count')
                ->orderBy('o.name')
                ->orderBy('full_name')
                ->get()->map(function ($item) {
                    return [
                        'organization_name' => $item->organization_name,
                        'full_name' => $item->full_name,
                        'position_name' => $item->position_name,
                        'absent_count' => $item->absent_count,
                        'absent_days' => $item->absent_days,
                    ];
                })->values()->toArray();

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new DynamicExportFromArray($data, 'worker', [
                'organization_name',
                'full_name',
                'position_name',
                'absent_count',
                'absent_days',
            ]), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value,]);
        } catch (Throwable $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
