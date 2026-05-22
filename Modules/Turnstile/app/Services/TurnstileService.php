<?php

namespace Modules\Turnstile\Services;

use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class TurnstileService
{
    public function whiteList(): array
    {
        return [62309, 16655, 25394, 19278, 587];
    }

    public function dontInstallDeviceOrgIds(): array
    {
        return [1, 222, 208, 197, 194, 188, 189, 192, 152, 153, 151, 63];
    }

    public function filterQuery($user): Builder
    {
        return Worker::query()
            ->join('worker_positions as wp', function ($q) use ($user) {
                $q->on('wp.worker_id', '=', 'workers.id')
                    ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                    ->when(request('departments'), function ($q) {
                        $q->whereIn('wp.department_id', explode(',', request('departments')));
                    });
                return QueryHelper::filterByOrganizations($q, $user, request()->all());
            })
            ->searchByFullName()
            ->leftJoin('organizations as o', 'o.id', '=', 'wp.organization_id')
            ->leftJoin('departments as d', 'd.id', '=', 'wp.department_id')
            ->leftJoin('positions as p', 'p.id', '=', 'wp.position_id');
    }


    public function lastEvent($query, $date)
    {
        $start = $date->copy()->startOfDay()->toDateTimeString();
        $end = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        return $query->leftJoin(
            DB::raw("LATERAL (
                SELECT te1.direction,te1.auth_type,te1.event_date_and_time AS last_event
                FROM terminal_events te1
                WHERE te1.worker_id = workers.id
                  AND te1.event_date_and_time >= '{$start}'
                  AND te1.event_date_and_time < '{$end}'
                ORDER BY te1.event_date_and_time DESC
                LIMIT 1
            ) AS te"),
            DB::raw('TRUE'),
            DB::raw('TRUE')
        );
    }

    public function statsForTurnstile($user, $date): array
    {
        $today = $date->copy()->toDateString();
        $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
        $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $allowedWorkerIds = WorkerPosition::filter($user,request()->all())
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            });

        $scheduledWorkersTodayCount = TurnstileWorkerSchedule::query()
            ->where('date', $today)
            ->whereIn('worker_position_id', $allowedWorkerIds->select('id'))
            ->whereNotIn('worker_id', $this->whiteList())
            ->whereNotNull('start_time')
            ->where('work_status', true)
            ->distinct('worker_id')->count();

        $attendedWorkersCount = TerminalEvent::query()
            ->whereBetween('event_date_and_time', [$startOfDay, $endOfDay])
            ->whereIn('worker_id', $allowedWorkerIds->select('worker_id'))
            ->whereNotIn('worker_id', $this->whiteList())
            ->distinct('worker_id')
            ->count();

        $subQuery = DB::table('workers as w')
            ->whereNotIn('w.id', $this->whiteList())
            ->leftJoin('worker_positions as wp', 'w.id', '=', 'wp.worker_id')
            ->whereIn('wp.id', $allowedWorkerIds->select('id'))
            ->leftJoin('turnstile_worker_schedules as st', function ($join) use ($today) {
                $join->on('wp.id', '=', 'st.worker_position_id')
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
            ->where('wp.is_turnstile', true)
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->whereNotIn('wp.organization_id', $this->dontInstallDeviceOrgIds())
            ->select(
                'w.id as worker_id',
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

        $absentWorkersTodayCount = DB::table(DB::raw("({$subQuery->toSql()}) as sub"))
            ->mergeBindings($subQuery)
            ->whereIn('status', ['no_schedule_absent', 'scheduled_absent'])
            ->count();

        return [
            'totalWorkers' => $allowedWorkerIds->count(),
            'scheduled_workers_today' => $scheduledWorkersTodayCount,
            'attended_workers_today' => $attendedWorkersCount,
            'absent_workers_today' => $absentWorkersTodayCount
        ];
    }

    public function scheduleStatsByMonth($user, $date): array
    {
        $monthStart = $date->copy()->startOfMonth()->toDateString();
        $monthEnd = $date->copy()->endOfMonth()->toDateString();

        $scheduledIds = TurnstileWorkerSchedule::query()
            ->whereBetween('date', [$monthStart, $monthEnd])
            ->select('worker_position_id');

        $vacationWorkerIds = DB::table('vacations')
            ->whereDate('from', '<=', $monthEnd)
            ->whereDate('to', '>=', $monthStart)
            ->pluck('worker_id');

        $baseQuery = WorkerPosition::query()
            ->filter($user, request()->all())
            ->where('is_turnstile', true)
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            })
            ->whereNotIn('id', $scheduledIds)
            ->whereNotIn('worker_id', $vacationWorkerIds);

        $nCount = (clone $baseQuery)->count();

        $workerList = (clone $baseQuery)
            ->with(['worker:id,last_name,first_name,middle_name,photo'])
            ->limit(5)
            ->get()
            ->map(function ($wp) {
                return [
                    'worker_id' => $wp->worker_id,
                    'last_name' => $wp->worker->last_name,
                    'first_name' => $wp->worker->first_name,
                    'middle_name' => $wp->worker->middle_name,
                    'photo' => Helper::fileUrl($wp->worker->photo),
                ];
            });

        return [
            'count' => $nCount,
            'workerList' => $workerList
        ];
    }

    public function lateAndEarlyStatsGroupedByDays($user, $date): array
    {
        $dates = collect(range(0, 2))
            ->map(fn($i) => $date->copy()->subDays($i)->format('Y-m-d'))
            ->values()
            ->toArray();

        $lateCounts = $this->getLateWorkersGroupedByDays($dates, $user);
        $earlyCounts = $this->getEarlyWorkersGroupedByDays($dates, $user);

        $data = [];
        foreach ($lateCounts as $date => $count) {
            $data['late'][] = [
                'date' => $date,
                'count' => $count
            ];
        }

        foreach ($earlyCounts as $date => $count) {
            $data['early'][] = [
                'date' => $date,
                'count' => $count
            ];
        }

        return ['late_and_early' => $data];
    }

    public function existSql($user): string
    {
        $whiteList = implode(',', $this->whiteList());

        $departments = request('departments')
            ? implode(',', explode(',', request('departments')))
            : null;

        $organizations = request('organizations')
            ? implode(',', explode(',', request('organizations')))
            : null;

        $organizationId = request('organization_id');

        $childOrgIds = QueryHelper::childIds($user, true);
        $childOrgIdsSql = $childOrgIds ? implode(',', $childOrgIds) : null;

        return "
            EXISTS (
                SELECT 1
                FROM worker_positions wp
                WHERE wp.id = t.worker_position_id
                  AND wp.status = " . PositionStatusEnum::ACTIVE->value . "
                  AND wp.is_turnstile = true
                  AND wp.deleted_at IS NULL
                  AND wp.worker_id NOT IN ({$whiteList})
                  " . ($departments ? "AND wp.department_id IN ({$departments})" : "") . "

                  -- organization filter (priority: request > childIds)
                  " . ($organizationId
                ? "AND wp.organization_id = {$organizationId}"
                : ($organizations
                    ? "AND wp.organization_id IN ({$organizations})"
                    : ($childOrgIdsSql
                        ? "AND wp.organization_id IN ({$childOrgIdsSql})"
                        : ""
                    )
                )
            ) . "
            )
        ";
    }

    public function getLateWorkersGroupedByDays($dates, $user): array
    {
        $parts = [];
        foreach ($dates as $date) {
            $d1 = $date;
            $d2 = date('Y-m-d', strtotime($date . ' +1 day'));
            $parts[] = "SELECT '{$d1}' AS date,
                COUNT(DISTINCT t.worker_id) AS late_count
            FROM turnstile_worker_schedules t
            LEFT JOIN LATERAL (
                SELECT te.event_date_and_time, te.direction
                FROM terminal_events te
                WHERE te.worker_id = t.worker_id
                  AND te.event_date_and_time >= '{$d1}'
                  AND te.event_date_and_time <  '{$d2}'
                  AND te.deleted_at is null
                ORDER BY te.event_date_and_time
                LIMIT 1
            ) AS first_te ON TRUE
            AND first_te.direction = TRUE
            WHERE t.date = '{$d1}'
              AND t.work_status = 1
              AND t.start_time <> '00:00'
              AND t.deleted_at IS NULL
              AND {$this->existSql($user)}
              AND first_te.event_date_and_time::time > t.start_time";
        }

        $sql = implode(" UNION ALL ", $parts) . " ORDER BY date DESC";
        $query = DB::select($sql);

        return collect($query)->pluck('late_count', 'date')->toArray();
    }

    public function getEarlyWorkersGroupedByDays($dates, $user): array
    {
        $parts = [];
        foreach ($dates as $d1) {
            $d2 = date('Y-m-d', strtotime($d1 . ' +1 day'));
            $parts[] = "
            SELECT
                '{$d1}' AS date,
                COUNT(DISTINCT t.worker_id) AS early_count
            FROM turnstile_worker_schedules t
            LEFT JOIN LATERAL (
                SELECT te.event_date_and_time, te.direction
                FROM terminal_events te
                WHERE te.worker_id = t.worker_id
                  AND te.event_date_and_time >= '{$d1}'
                  AND te.event_date_and_time <  '{$d2}'
                  AND te.deleted_at is null
                ORDER BY te.event_date_and_time DESC
                LIMIT 1
            ) AS last_te ON TRUE AND last_te.direction = false
            WHERE t.date = '{$d1}'
              AND t.work_status = 1
              AND t.deleted_at IS NULL
              AND t.end_time IS NOT NULL
              AND {$this->existSql($user)}
              AND last_te.event_date_and_time::time < t.end_time
        ";
        }

        $sql = implode(" UNION ALL ", $parts) . " ORDER BY date DESC";

        $query = DB::select($sql);

        return collect($query)->pluck('early_count', 'date')->toArray();
    }

    public function statsCurrentEvents($user, $date): array
    {
        $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
        $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $allowedWorkerSubquery = WorkerPosition::filter($user, request()->all())
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            })
            ->select('worker_id');

        // 1. Stats (sonlar)
        $stats = DB::select("
        SELECT
            COUNT(DISTINCT CASE WHEN te.direction = true AND te.rn = 1 THEN te.worker_id END) as current_in,
            COUNT(DISTINCT CASE WHEN te.direction = false AND te.rn = 1 THEN te.worker_id END) as current_out
        FROM (
            SELECT
                te.worker_id,
                te.direction,
                ROW_NUMBER() OVER (
                    PARTITION BY te.worker_id
                    ORDER BY te.event_date_and_time DESC
                ) as rn
            FROM terminal_events te
            WHERE te.worker_id IN ({$allowedWorkerSubquery->toSql()})
                AND te.event_date_and_time >= ?
                AND te.event_date_and_time < ?
        ) te
    ", array_merge(
            $allowedWorkerSubquery->getBindings(),
            [$startOfDay, $endOfDay]
        ));

        // 2. TOP 3 ishxonadagi xodimlar
        $topInWorkers = DB::select("
        SELECT
            te.worker_id,
            w.last_name,
            w.first_name,
            w.middle_name,
            w.photo,
            te.event_date_and_time as last_entry_time
        FROM (
            SELECT
                te.worker_id,
                te.event_date_and_time,
                ROW_NUMBER() OVER (
                    PARTITION BY te.worker_id
                    ORDER BY te.event_date_and_time DESC
                ) as rn
            FROM terminal_events te
            WHERE te.worker_id IN ({$allowedWorkerSubquery->toSql()})
                AND te.direction = true
                AND te.event_date_and_time >= ?
                AND te.event_date_and_time < ?
        ) te
        INNER JOIN workers w ON te.worker_id = w.id
        WHERE te.rn = 1
            AND w.deleted_at IS NULL
        ORDER BY te.event_date_and_time DESC
        LIMIT 3
    ", array_merge(
            $allowedWorkerSubquery->getBindings(),
            [$startOfDay, $endOfDay]
        ));

        // 3. TOP 3 ishxonada bo'lmagan xodimlar
        $topOutWorkers = DB::select("
        SELECT
            te.worker_id,
            w.last_name,
            w.first_name,
            w.middle_name,
            w.photo,
            te.event_date_and_time as last_exit_time
        FROM (
            SELECT
                te.worker_id,
                te.event_date_and_time,
                ROW_NUMBER() OVER (
                    PARTITION BY te.worker_id
                    ORDER BY te.event_date_and_time DESC
                ) as rn
            FROM terminal_events te
            WHERE te.worker_id IN ({$allowedWorkerSubquery->toSql()})
                AND te.direction = false
                AND te.event_date_and_time >= ?
                AND te.event_date_and_time < ?
        ) te
        INNER JOIN workers w ON te.worker_id = w.id
        WHERE te.rn = 1
            AND w.deleted_at IS NULL
        ORDER BY te.event_date_and_time DESC
        LIMIT 3
    ", array_merge(
            $allowedWorkerSubquery->getBindings(),
            [$startOfDay, $endOfDay]
        ));

        return [
            'worker_stats' => [
                'current_in' => (int)($stats[0]->current_in ?? 0),
                'current_out' => (int)($stats[0]->current_out ?? 0),
                'top_in_workers' => array_map(static function ($item) {
                    return [
                        'worker_id' => $item->worker_id,
                        'last_name' => $item->last_name,
                        'first_name' => $item->first_name,
                        'middle_name' => $item->middle_name,
                        'photo' => Helper::fileUrl($item->photo),
                        'last_entry_time' => $item->last_entry_time
                    ];
                }, $topInWorkers),
                'top_out_workers' => array_map(static function ($item) {
                    return [
                        'worker_id' => $item->worker_id,
                        'last_name' => $item->last_name,
                        'first_name' => $item->first_name,
                        'middle_name' => $item->middle_name,
                        'photo' => Helper::fileUrl($item->photo),
                        'last_exit_time' => $item->last_exit_time
                    ];
                }, $topOutWorkers)
            ]
        ];
    }

    public function dailyAttendanceChart($user, $date): array
    {
        $workerIds = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            })
            ->select('worker_id');


        $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
        $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $events = TerminalEvent::select(
            DB::raw('FLOOR(EXTRACT(HOUR FROM event_date_and_time) / 2) as hour_block'),
            DB::raw('COUNT(*) as total')
        )
            ->whereIn('worker_id', $workerIds)
            ->whereBetween('event_date_and_time', [$startOfDay, $endOfDay])
            ->groupBy(DB::raw('FLOOR(EXTRACT(HOUR FROM event_date_and_time) / 2)'))
            ->pluck('total', 'hour_block');

        $data = [];
        for ($i = 0; $i < 24; $i += 2) {
            $block = floor($i / 2); // 0..11
            $data[] = [
                'hour' => sprintf('%02d:00', $i),
                'count' => isset($events[$block]) ? (int)$events[$block] : 0
            ];
        }
        $devices = HCPDevice::query()->filter($user,request()->all())->get();

        // 3. Bugun kirganlar (HAMMASI, grafikdan qat'i nazar)
        $eventCounts = TerminalEvent::query()
            ->whereBetween('event_date_and_time', [$startOfDay, $endOfDay])
            ->whereIn('worker_id', $workerIds)
            ->selectRaw("
                COUNT(DISTINCT CASE WHEN auth_type = 'MobileFaceEvent' THEN worker_id END) as mobile_face_count,
                COUNT(DISTINCT worker_id) as total_count
            ")
            ->first();

        $mobileFaceCount = $eventCounts->mobile_face_count ?? 0;
        $otherCount = $eventCounts->total_count ?? 0;

        return [
            'daily_attendance_chart' => $data,
            'devices' => [
                'all' => $devices->count(),
                'online' => $devices->where('status', true)->count(),
                'offline' => $devices->where('status', false)->count(),
            ],
            'auth_type' => [
                'mobile_face' => $mobileFaceCount,
                'other' => $otherCount - $mobileFaceCount
            ]
        ];
    }

    public function devives($user): array
    {
        $devices = HCPDevice::query()->filter($user, request()->all())->get();
        return [
            'all' => $devices->count(),
            'online' => $devices->where('status', true)->count(),
            'offline' => $devices->where('status', false)->count(),
        ];
    }

    public function privilegeTurnstile($user, $date): array
    {
        $workerIds = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('departments'), function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->select('worker_id');

        $notPassedTurnstileWorkers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('departments'), function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->where('is_turnstile', false)
            ->count();


        $privilegeTurnstileWorkers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('departments'), function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->where(function ($query) {
                $query->where('turnstile_privilege_start_minute', '!=', 0)
                    ->orWhere('turnstile_privilege_end_minute', '!=', 0);
            })
            ->count();

        $vacationWorkers = Vacation::query()
            ->whereIn('worker_id', $workerIds)
            ->whereDate('to', '>=', $date);

        $vacationCount = $vacationWorkers->count();

        $casualWorkers = TurnstileWorkerSchedule::query()
            ->whereIn('worker_id', $workerIds)
            ->whereDate('date', $date)
            ->where('work_status', 0)
            ->count();

        return [
            'not_passed_turnstile_workers_count' => $notPassedTurnstileWorkers,
            'privilege_turnstile_workers_count' => $privilegeTurnstileWorkers,
            'vacation_workers' => ['total' => $vacationCount],
            'casual_workers' => $casualWorkers
        ];

    }
}
