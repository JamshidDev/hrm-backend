<?php

namespace App\Jobs;

use App\Exports\ArrayExport;
use App\Exports\ExportFromQuery;
use App\Helpers\Helper;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPhoto;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\TerminalEvent;

class TestJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    public function handle(): void
    {
        try {
            Excel::store(new ExportFromQuery(), 'tests.xlsx', 'public');
        } catch (\Throwable $e) {
            Helper::setLog($e);
        }
    }

    public function repeatedAbsentWorkersByPosition(): void
    {
        $date = now()->startOfDay();
        $yearStart = $date->copy()->startOfYear();
        $minAbsentDays = 2;

        $calendarSql = sprintf(
            "generate_series('%s'::date, '%s'::date, interval '1 day') as calendar(day)",
            $yearStart->toDateString(),
            $date->toDateString()
        );

        $workerIds = WorkerPosition::query()
            ->where('organization_id', 196)
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->pluck('worker_id')->toArray();

        $eventDays = TerminalEvent::query()
            ->whereIn('worker_id', $workerIds)
            ->selectRaw('worker_position_id, DATE(event_date_and_time) as event_day')
            ->whereNotNull('worker_position_id')
            ->whereNull('deleted_at')
            ->where('event_date_and_time', '>=', $yearStart->toDateTimeString())
            ->where('event_date_and_time', '<', $date->copy()->addDay()->toDateTimeString())
            ->groupBy('worker_position_id', DB::raw('DATE(event_date_and_time)'));

        $vacationDaysSql = sprintf(
            "(
                SELECT DISTINCT
                    v.worker_position_id,
                    gs::date as vacation_day
                FROM vacations v
                CROSS JOIN LATERAL generate_series(v.from, v.to, interval '1 day') as gs
                WHERE v.deleted_at IS NULL
                  AND v.worker_position_id IS NOT NULL
                  AND v.from IS NOT NULL
                  AND v.to IS NOT NULL
                  AND v.from <= '%s'::date
                  AND v.to >= '%s'::date
            ) as vacation_days",
            $date->toDateString(),
            $yearStart->toDateString()
        );

        $workers = WorkerPosition::query()
            ->where('wp.organization_id', 196)
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->withoutGlobalScope(SoftDeletingScope::class)
            ->from('worker_positions as wp')
            ->whereNull('wp.deleted_at')
            ->join('workers as w', 'wp.worker_id', '=', 'w.id')
            ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
            ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
            ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
            ->crossJoin(DB::raw($calendarSql))
            ->leftJoin('turnstile_worker_schedules as st', function ($join) {
                $join->on('st.worker_position_id', '=', 'wp.id')
                    ->whereRaw('st.date = calendar.day::date')
                    ->whereNull('st.deleted_at');
            })
            ->leftJoinSub($eventDays, 'event_days', function ($join) {
                $join->on('event_days.worker_position_id', '=', 'wp.id')
                    ->whereRaw('event_days.event_day = calendar.day::date');
            })
            ->leftJoin(DB::raw($vacationDaysSql), function ($join) {
                $join->on('vacation_days.worker_position_id', '=', 'wp.id')
                    ->whereRaw('vacation_days.vacation_day = calendar.day::date');
            })
            ->where('wp.is_turnstile', true)
            ->whereNull('w.deleted_at')
            ->whereNotIn('w.id', [62309, 16655, 25394, 19278])
            ->selectRaw("
                wp.id as worker_position_id,
                wp.worker_id,
                w.last_name,
                w.first_name,
                w.middle_name,
                w.photo,
                o.name as organization_name,
                d.name as department_name,
                p.name as position_name,
                COUNT(*) FILTER (
                    WHERE
                        CASE
                            WHEN st.id IS NOT NULL THEN COALESCE(st.work_status, 0) = 1
                            ELSE EXTRACT(ISODOW FROM calendar.day) NOT IN (6, 7)
                        END
                ) as work_day_count,
                COUNT(*) FILTER (
                    WHERE
                        CASE
                            WHEN st.id IS NOT NULL THEN COALESCE(st.work_status, 0) = 1
                            ELSE EXTRACT(ISODOW FROM calendar.day) NOT IN (6, 7)
                        END
                        AND event_days.worker_position_id IS NULL
                        AND vacation_days.worker_position_id IS NULL
                ) as absent_day_count
            ")
            ->groupBy(
                'wp.id',
                'wp.worker_id',
                'w.last_name',
                'w.first_name',
                'w.middle_name',
                'w.photo',
                'o.name',
                'd.name',
                'p.name'
            )
            ->havingRaw("
                COUNT(*) FILTER (
                    WHERE
                        CASE
                            WHEN st.id IS NOT NULL THEN COALESCE(st.work_status, 0) = 1
                            ELSE EXTRACT(ISODOW FROM calendar.day) NOT IN (6, 7)
                        END
                        AND event_days.worker_position_id IS NULL
                        AND vacation_days.worker_position_id IS NULL
                ) >= ?
            ", [$minAbsentDays])
            ->orderByDesc('absent_day_count')
            ->orderByDesc('work_day_count')
            ->orderBy('w.last_name')
            ->orderBy('w.first_name')
            ->get()->map(function ($worker) {

                $workDayCount = (int)$worker->work_day_count;
                $absentDayCount = (int)$worker->absent_day_count;

                return [
                    'full_name' => $worker->last_name . ' ' . $worker->first_name . ' ' . $worker->middle_name,
                    'organization_name' => $worker->organization_name,
                    'department_name' => $worker->department_name,
                    'position_name' => $worker->position_name,
                    'work_day_count' => $workDayCount,
                    'absent_day_count' => $absentDayCount
                ];
            })->values()->toArray();

        Excel::store(new ArrayExport($workers), 'test.xlsx', 'public');
    }

    public function sizePhoto()
    {
        WorkerPhoto::query()
            ->whereNull('size')
            ->orderBy('id')
            ->chunkById(100, function ($items) {
                foreach ($items as $photo) {
                    try {
                        $size = Storage::disk('minio')->size($photo->photo);
                        $photo->update(['size' => $size]);
                    } catch (\Throwable $e) {
                        $photo->update(['size' => 0]);
                    }
                }
            });
    }

}
