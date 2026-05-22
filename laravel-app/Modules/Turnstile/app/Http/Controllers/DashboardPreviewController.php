<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\HR\VacationWorkersExportJob;
use App\Jobs\TurnstileJobs\CurrentStatusWorkersExportToExcelJob;
use App\Jobs\TurnstileJobs\HCPDailyAttendanceExportToExcelJob;
use App\Jobs\TurnstileJobs\HCPDevicesStatusesExportToExcelJob;
use App\Jobs\TurnstileJobs\TurnstileAbsentWorkersExportToExcelJob;
use App\Jobs\TurnstileJobs\TurnstileComeWorkersExportToExcelJob;
use App\Jobs\TurnstileJobs\TurnstileEarlyLeaveWorkersExportToExcelJob;
use App\Jobs\TurnstileJobs\TurnstileLateWorkersExportToExcelJob;
use App\Jobs\TurnstileJobs\TurnstileNotScheduleWorkersExportToExcelJob;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;
use Modules\Turnstile\Services\TurnstileService;
use Modules\Turnstile\Transformers\EventListResource;
use Modules\Turnstile\Transformers\Preview\AbsentWorkersResource;
use Modules\Turnstile\Transformers\Preview\CasualWorkersResource;
use Modules\Turnstile\Transformers\Preview\CurrentInResource;
use Modules\Turnstile\Transformers\Preview\DevicesResource;
use Modules\Turnstile\Transformers\Preview\EarlyLeaveResource;
use Modules\Turnstile\Transformers\Preview\LateComeResource;
use Modules\Turnstile\Transformers\Preview\NotIncludedWorkersResource;
use Modules\Turnstile\Transformers\Preview\NotPassedWorkersResource;
use Modules\Turnstile\Transformers\Preview\PrivilegeWorkersResource;
use Modules\Turnstile\Transformers\Preview\VacationResource;

class DashboardPreviewController extends Controller
{
    public function __construct(public TurnstileService $service)
    {
    }

    public function preview(Request $request): JsonResponse
    {
        $status = request('download', 'view');
        return match ($request->type) {
            'current_in' => $this->lastEventWorkers($status, $request, true),
            'current_out' => $this->lastEventWorkers($status, $request, false),
            'not_come' => $this->getAbsentWorkersToday($status, $request),
            'come' => $this->comeWorkers($status, $request),
            'late_come' => $this->lateWorkersByDate($status, $request),
            'early_leave' => $this->earlyLeavingWorkersByDate($status, $request),
            'online_devices' => $this->devices($status, true),
            'offline_devices' => $this->devices($status, false),
            'daily_attendance' => $this->dailyAttendance($status, $request),
            'vacations' => $this->vacations($status, $request),
            'not_passed_turnstile_workers' => $this->notPassedTurnstileWorkers($status, $request),
            'privilege_turnstile_workers' => $this->privilegeTurnstileWorkers($status, $request),
            'casual_workers' => $this->casualWorkers($status, $request),
            'notIncludedSchedule' => $this->notIncludedScheduleWorkers($status, $request),
            default => Helper::response()
        };
    }

    public function vacations($status, $request): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()));
        $per_page = $request->per_page ?? 10;
        if ($status !== 'view') {
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::WORKERS->value,
            ]);

            $query = $request->all();
            VacationWorkersExportJob::dispatch($query, $task, $user->id);
            return Helper::response(trans('messages.successfully_exported'));
        }
        $data = Vacation::query()
            ->whereIn('worker_id', WorkerPosition::filter($user, request()->all())
                ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
                ->select('worker_id'))
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->with([
                'worker_position.worker:id,first_name,last_name,middle_name,photo',
                'worker_position.department:id,name,level',
                'worker_position.position:id,name',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
            ])
            ->whereDate('to', '>=', $date->toDateString())
            ->orderByDesc('to')
            ->paginate($per_page);

        $data = PaginateResource::make($data, VacationResource::class);
        return Helper::response(true, $data);
    }

    public function notIncludedScheduleWorkers($status, $request): JsonResponse
    {
        $user = auth()->user();

        if ($status !== 'view') {
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::NOT_INCLUDE_SCHEDULE_WORKERS->value,
            ]);

            $query = $request->all();
            TurnstileNotScheduleWorkersExportToExcelJob::dispatch($query, $task, $user->id);
            return Helper::response(trans('messages.successfully_exported'));
        }

        $date = Carbon::parse(request('date', now()->toDateString()));

        $scheduleData = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_ru,name_en,full_name,group',
                'department:id,name,level',
                'position:id,name'
            ])
            ->when($request->departments, function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->whereDoesntHave('scheduleDays', function ($query) use ($date) {
                $query->whereDate('date', $date);
            })
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($scheduleData, NotIncludedWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function notPassedTurnstileWorkers($status, $request): JsonResponse
    {
        $user = auth()->user();
        $notPassedTurnstileWorkers = WorkerPosition::query()
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->filter($user, request()->all())
            ->where('is_turnstile', false)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_ru,name_en,full_name,group',
                'department:id,name,level',
                'position:id,name'
            ])
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($notPassedTurnstileWorkers, NotPassedWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function privilegeTurnstileWorkers($status, $request): JsonResponse
    {
        $user = auth()->user();
        $notPassedTurnstileWorkers = WorkerPosition::query()
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->filter($user, request()->all())
            ->when($request->departments, function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->where('turnstile_privilege_start_minute', '!=', 0)
            ->orWhere('turnstile_privilege_end_minute', '!=', 0)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,name_ru,name_en,full_name,group',
                'department:id,name,level',
                'position:id,name'
            ])
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($notPassedTurnstileWorkers, PrivilegeWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function casualWorkers($status, $request): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()));
        $workerIds = WorkerPosition::filter($user, request()->all())
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->select('worker_id')
            ->when($request->departments, function (Builder $query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            });
        $casualWorkers = TurnstileWorkerSchedule::query()
            ->whereIn('worker_id', $workerIds)
            ->whereDate('date', $date->toDateString())
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'worker_position:id,worker_id,position_id,department_id,organization_id',
                'worker_position.position:id,name',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_ru,name_en,full_name,group'
            ])
            ->where('work_status', 0)
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($casualWorkers, CasualWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function lateWorkersByDate($status, $request): JsonResponse
    {
        $user = auth()->user();

        if ($status !== 'view') {
            $type = ExportTaskEnum::TURNSTILE_LATE_WORKERS->value;
            $task = UserExportTask::create(['user_id' => $user->id, 'type' => $type]);
            $query = request()->all();
            TurnstileLateWorkersExportToExcelJob::dispatch($task, $query, $user->id, $this->service->whiteList());
            return Helper::response(trans('messages.successfully_exported'));
        }

        $date = Carbon::parse(request('date', now()->toDateString()));
        $perPage = $request->per_page ?? 10;

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
                turnstile_worker_schedules.start_time,
                te_first.event_date_and_time as first_entry_time,
                EXTRACT(EPOCH FROM (te_first.event_date_and_time::time - turnstile_worker_schedules.start_time)) / 60 as delay_minutes
            ")
            ->join('workers as w', 'turnstile_worker_schedules.worker_id', '=', 'w.id')
            ->whereNotIn('w.id', $this->service->whiteList())
            ->leftJoin('worker_positions as wp', function ($join) use ($user) {
                $join->on('turnstile_worker_schedules.worker_position_id', '=', 'wp.id')
                    ->whereIn('wp.id',
                        WorkerPosition::filter($user, request()->all())
                            ->select('id'));
            })
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->where('wp.is_turnstile', true)
            ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
            ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
            ->when($request->departments, function ($query, $departments) {
                $query->whereIn('wp.department_id', explode(',', $departments));
            })
            ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
            ->join(DB::raw('LATERAL (
                SELECT te.event_date_and_time, te.direction
                FROM terminal_events te
                WHERE te.worker_id = turnstile_worker_schedules.worker_id
                AND te.deleted_at IS NULL
                AND te.event_date_and_time >= \'' . $startOfDay . '\'
                AND te.event_date_and_time < \'' . $endOfDay . '\'
                ORDER BY te.event_date_and_time ASC
                LIMIT 1
            ) as te_first'), function ($join) {
                $join->where('te_first.direction', '=', true);// Faqat kirish bo'lsa
            })
            ->whereIn('turnstile_worker_schedules.worker_position_id', function ($subquery) use ($user) {
                $subquery->select('id')
                    ->from('worker_positions')
                    ->whereIn('id', WorkerPosition::filter($user, request()->all())->search()->select('id'))
                    ->whereNotNull('worker_id');
            })
            ->where('turnstile_worker_schedules.date', $date)
            ->whereNotNull('turnstile_worker_schedules.start_time')
            ->whereNot('turnstile_worker_schedules.start_time', '00:00:00')
            ->where('turnstile_worker_schedules.work_status', 1)
            ->whereRaw("te_first.event_date_and_time::time > turnstile_worker_schedules.start_time")
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
                'turnstile_worker_schedules.start_time',
                'te_first.event_date_and_time'
            )
            ->orderBy('delay_minutes', 'desc')
            ->orderBy('w.last_name')
            ->orderBy('w.first_name');

        $lateWorkers = $query->paginate($perPage);
        $data = PaginateResource::make($lateWorkers, LateComeResource::class);
        return Helper::response(true, $data);
    }

    public function earlyLeavingWorkersByDate($status, $request): JsonResponse
    {
        $user = auth()->user();
        if ($status !== 'view') {
            $type = ExportTaskEnum::TURNSTILE_EARLY_LEAVE_WORKERS->value;
            $task = UserExportTask::create(['user_id' => $user->id, 'type' => $type]);
            $query = request()->all();
            TurnstileEarlyLeaveWorkersExportToExcelJob::dispatch($task, $query, $user->id);
            return Helper::response(trans('messages.successfully_exported'));
        }

        $date = Carbon::parse(request('date', now()->toDateString()));
        $perPage = $request->per_page ?? 10;

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
            ->leftJoin('worker_positions as wp', function ($join) use ($user) {
                $join->on('turnstile_worker_schedules.worker_position_id', '=', 'wp.id')
                    ->whereIn('wp.id', WorkerPosition::filter($user, request()->all())->select('id'));
            })
            ->whereNotIn('w.id', $this->service->whiteList())
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->where('wp.is_turnstile', true)
            ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
            ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
            ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
            ->when($request->departments, function ($query, $departments) {
                $query->whereIn('wp.department_id', explode(',', $departments));
            })
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
                $join->where('te_last.direction', '=', false); // Faqat chiqish bo'lsa
            })
            ->whereIn('turnstile_worker_schedules.worker_position_id', function ($subquery) use ($user) {
                $subquery->select('id')
                    ->from('worker_positions')
                    ->whereIn('id', WorkerPosition::filter($user, request()->all())->search()->select('worker_id'))
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
            ->orderBy('w.first_name');

        $earlyWorkers = $query->paginate($perPage);
        $data = PaginateResource::make($earlyWorkers, EarlyLeaveResource::class);
        return Helper::response(true, $data);
    }

    public function getAbsentWorkersToday($status, $request): JsonResponse
    {
        $user = auth()->user();
        if ($status !== 'view') {
            $type = ExportTaskEnum::TURNSTILE_ABSENT_WORKERS->value;
            $task = UserExportTask::create(['user_id' => $user->id, 'type' => $type]);
            $query = request()->all();
            TurnstileAbsentWorkersExportToExcelJob::dispatch($task, $query, $user->id, $this->service->whiteList());
            return Helper::response(trans('messages.successfully_exported'));
        }

        $date = Carbon::parse($request->date ?? now());

        $today = $date->copy()->toDateString();
        $startOfDay = $date->copy()->startOfDay()->toDateTimeString();
        $endOfDay = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $workerIds = WorkerPosition::filter($user, request()->all())
            ->when(request('search'), fn($query) => $query->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->select('id');

        $subQuery = DB::table('workers as w')
            ->whereNotIn('w.id', $this->service->whiteList())
            ->leftJoin('worker_positions as wp', 'w.id', '=', 'wp.worker_id')
            ->where('wp.is_turnstile', true)
            ->whereIn('wp.id', $workerIds)
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->leftJoin('organizations as o', 'wp.organization_id', '=', 'o.id')
            ->leftJoin('departments as d', 'wp.department_id', '=', 'd.id')
            ->when($request->departments, function ($query, $departments) {
                $query->whereIn('wp.department_id', explode(',', $departments));
            })
            ->leftJoin('positions as p', 'wp.position_id', '=', 'p.id')
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
            ->whereNull('v.worker_id')
            ->whereNull('w.deleted_at')
            ->select(
                'w.id as worker_id',
                'w.last_name',
                'w.first_name',
                'w.middle_name',
                'w.photo',
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
            "))
            ->distinct('worker_id');

        $allWorkers = DB::table(DB::raw("({$subQuery->toSql()}) as sub"))
            ->mergeBindings($subQuery)
            ->whereIn('status', ['no_schedule_absent', 'scheduled_absent']);

        $data = $allWorkers->paginate($request->per_page ?? 10);
        $data = PaginateResource::make($data, AbsentWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function filterVacationQuery($user, $day): Builder
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
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->leftJoin('vacations as vc', function ($q) use ($day) {
                $q->on('vc.worker_id', '=', 'workers.id')
                    ->whereDate('vc.from', '<=', $day)
                    ->whereDate('vc.to', '>=', $day);
            })
            ->whereNull('vc.id')
            ->searchByFullName()
            ->leftJoin('organizations as o', 'o.id', '=', 'wp.organization_id')
            ->leftJoin('departments as d', 'd.id', '=', 'wp.department_id')
            ->leftJoin('positions as p', 'p.id', '=', 'wp.position_id');
    }

    public function workDurationsSql($query, $date)
    {
        return $query->leftJoinSub(
            "(WITH events AS (
                SELECT
                    worker_id,
                    event_date_and_time AS event_dt,
                    direction,
                    ROW_NUMBER() OVER (PARTITION BY worker_id ORDER BY event_date_and_time) AS rn,
                    LEAD(direction) OVER (PARTITION BY worker_id ORDER BY event_date_and_time) AS next_dir,
                    LEAD(event_date_and_time) OVER (PARTITION BY worker_id ORDER BY event_date_and_time) AS next_dt,
                    LAG(direction) OVER (PARTITION BY worker_id ORDER BY event_date_and_time) AS prev_dir,
                    LAG(event_date_and_time) OVER (PARTITION BY worker_id ORDER BY event_date_and_time) AS prev_dt
                FROM terminal_events
                WHERE event_date_and_time::date = '$date'
            ),
            intervals AS (
                SELECT
                    worker_id,
                    CASE
                        WHEN direction = true AND next_dir = false THEN next_dt - event_dt
                        WHEN direction = true AND next_dir IS NULL THEN (event_dt::date + INTERVAL '1 day') - event_dt
                        WHEN direction = false AND prev_dir IS NULL THEN event_dt - (event_dt::date)::timestamp
                        WHEN direction = false AND prev_dir = false THEN event_dt - prev_dt
                        ELSE INTERVAL '0 second'
                    END AS interval_time
                FROM events
            )
            SELECT
                worker_id,
                SUM(EXTRACT(EPOCH FROM interval_time) / 60) AS total_minutes
            FROM intervals
            GROUP BY worker_id
            ORDER BY total_minutes DESC
        )", 'work_times',
            function ($join) {
                $join->on('work_times.worker_id', '=', 'workers.id');
            }
        );
    }

    public function currentWorkers($user, $vacation = false)
    {
        $date = Carbon::parse(request('date', now()->toDateString()));
        if ($vacation) {
            $q = $this->filterVacationQuery($user, $date->toDateString());
        } else {
            $q = $this->service->filterQuery($user);
        }
        return $this->service->lastEvent($q, $date);
    }

    public function lastEventWorkers($status, $request, $bool): JsonResponse
    {
        $user = auth()->user();
        if ($status === 'view') {
            $workers = $this->currentWorkers($user)
                ->distinct('workers.id')
                ->where('te.direction', $bool)
                ->select([
                    'workers.id as worker_id',
                    'workers.last_name',
                    'workers.first_name',
                    'workers.middle_name',
                    'workers.photo',
                    'te.last_event',
                    'te.direction',
                    'o.name as organization_name',
                    'd.name as department_name',
                    'p.name as position_name',
                ])
                ->paginate($request->per_page ?? 10);
            $data = PaginateResource::make($workers, CurrentInResource::class);
            return Helper::response(true, $data);
        }
        if ($bool) {
            $type = ExportTaskEnum::TURNSTILE_CURRENT_IN_WORKERS->value;
        } else {
            $type = ExportTaskEnum::TURNSTILE_CURRENT_OUT_WORKERS->value;
        }
        $task = UserExportTask::create(['user_id' => $user->id, 'type' => $type]);
        $query = request()->all();
        CurrentStatusWorkersExportToExcelJob::dispatch($task, $query, $user->id, $bool);
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function comeWorkers($status, $request): JsonResponse
    {
        $user = auth()->user();
        if ($status === 'view') {
            $workers = $this->currentWorkers($user)
                ->whereNotIn('o.id', $this->service->dontInstallDeviceOrgIds())
                ->distinct('workers.id')
                ->whereNotNull('te.direction')
                ->when($request->auth_type, function ($query, $auth_type) {
                    if ($auth_type === 'MobileFaceEvent') {
                        $query->where('te.auth_type', 'MobileFaceEvent');
                    } elseif ($auth_type === 'ACSEventFaceVerifyPass') {
                        $query->whereNot('te.auth_type', 'MobileFaceEvent');
                    }
                })
                ->select([
                    'workers.id as worker_id',
                    'workers.last_name',
                    'workers.first_name',
                    'workers.middle_name',
                    'workers.photo',
                    'te.last_event',
                    'te.direction',
                    'o.name as organization_name',
                    'd.name as department_name',
                    'p.name as position_name',
                ])
                ->paginate($request->per_page ?? 10);

            $data = PaginateResource::make($workers, CurrentInResource::class);
            return Helper::response(true, $data);
        }
        $task = UserExportTask::create(['user_id' => $user->id, 'type' => ExportTaskEnum::TURNSTILE_COME->value]);
        $query = request()->all();
        TurnstileComeWorkersExportToExcelJob::dispatch($task, $query, $user->id, $this->service->dontInstallDeviceOrgIds(), $this->service->whiteList());
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function dailyAttendance($status, $request): JsonResponse
    {
        $user = auth()->user();
        $day = request('date', now()->toDateString());
        $startTime = $day . ' ' . $request->start_time . ':00';
        $endTime = $day . ' ' . $request->end_time . ':00';
        if ($status === 'view') {
            $workerIds = WorkerPosition::query()
                ->select('worker_id')
                ->filter($user, request()->all())
                ->whereNotIn('organization_id', $this->service->dontInstallDeviceOrgIds())
                ->when(request('departments'), function ($q) {
                    $q->whereIn('department_id', explode(',', request('departments')));
                })
                ->distinct();
            $events = TerminalEvent::query()
                ->whereIn('worker_id', $workerIds)
                ->whereDate('event_date_and_time', $day)
                ->when(request('direction'), function ($query, $direction) {
                    $query->where('direction', (int)$direction === 1);
                })
                ->with('worker:id,last_name,first_name,middle_name,photo,birthday')
                ->orderByDesc('event_date_and_time')
                ->where('event_date_and_time', '>=', $startTime)
                ->where('event_date_and_time', '<=', $endTime)
                ->paginate(request('per_page', 10));
            $data = PaginateResource::make($events, EventListResource::class);
            return Helper::response(true, ['events' => $data]);
        }

        $task = UserExportTask::create(['user_id' => $user->id, 'type' => ExportTaskEnum::TURNSTILE_DAILY_ATTENDANCE->value]);
        $query = request()->all();
        HCPDailyAttendanceExportToExcelJob::dispatch($task, $query, $user->id);
        return Helper::response(trans('messages.successfully_exported'));
    }


    public function devices($status, $bool): JsonResponse
    {
        $user = auth()->user();

        if ($status !== 'view') {
            $task = UserExportTask::create(['user_id' => $user->id, 'type' => ExportTaskEnum::DEVICES->value]);
            HCPDevicesStatusesExportToExcelJob::dispatch($task, $user->id);
            return Helper::response(trans('messages.successfully_exported'));
        }

        $devices = HCPDevice::query()
            ->filter($user, request()->all())
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%");
            })
            ->with(['organization:id,name'])
            ->where('status', $bool)
            ->paginate(request('per_page', 10));

        $devices = PaginateResource::make($devices, DevicesResource::class);
        return Helper::response(true, $devices);
    }
}
