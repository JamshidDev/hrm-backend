<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Helpers\TurnStileHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\SyncEventsHCPOptimizedJob;
use App\Jobs\TurnstileJobs\TurnstileEventsExportToExcelJob;
use App\Models\UserExportTask;
use App\Services\HikCentralService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Enums\SyncTypeEnum;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\HikCentralAccessLevelDevice;
use Modules\Turnstile\Models\HikCentralDevice;
use Modules\Turnstile\Models\SyncHCPAccessLog;
use Modules\Turnstile\Models\SyncOfflineDevice;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Services\TurnstileService;
use Modules\Turnstile\Transformers\EventListResource;
use Modules\Turnstile\Transformers\Preview\LessonWorkedResource;
use Modules\Turnstile\Transformers\WorkerTerminalEventsResource;

class EventController extends Controller
{
    public function __construct(public TurnstileService $service)
    {
    }

    public function index(): JsonResponse
    {
        $user = auth()->user();
        $workerIds = WorkerPosition::query()
            ->select('worker_id')
            ->whereNotIn('worker_id', $this->service->whiteList())
            ->filter($user, request()->all())
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            })
            ->distinct();
        $date = Carbon::parse(request('date', now()->toDateString()));
        $startTime = $date->copy()->startOfDay()->toDateTimeString();
        $end = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $events = TerminalEvent::query()
            ->search()
            ->whereIn('worker_id', $workerIds)
            ->where('event_date_and_time', '>=', $startTime)
            ->where('event_date_and_time', '<', $end)
            ->when(request('direction'), function ($query, $direction) {
                $query->where('direction', (int)$direction === 1);
            })
            ->when(request('access_levels'), function ($query) {
                $query->whereIn('hik_central_access_level_id', explode(',', request('access_levels')));
            })
            ->with('worker:id,last_name,first_name,middle_name,photo,birthday')
            ->orderByDesc('event_date_and_time')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($events, EventListResource::class);
        return Helper::response(true, $data);
    }

    public function syncEvents(Request $request): JsonResponse
    {
        $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'access_level_ids' => 'sometimes|array',
        ]);

        if (abs(Carbon::parse($request->to_date)->diffInDays(Carbon::parse($request->from_date))) > 30) {
            return Helper::response(trans('messages.errors.diff_dates_max_30_day'), [], 400);
        }

        $user = auth()->user();

        new HikCentralService()->devices();

        Cache::forget('access_level_ids_' . $user->id);
        $accessLevels = Helper::userAccessLevels($user);
        $deviceIds = HikCentralAccessLevelDevice::query()
            ->whereIn('hik_central_access_level_id', $request->access_level_ids ?? $accessLevels)
            ->pluck('hik_central_device_id')
            ->toArray();

        $devices = HikCentralDevice::query()
            ->whereIn('id', $deviceIds)
            ->get()
            ->map(function ($item) {
                return (string)$item->hik_central_device_id;
            })
            ->values()
            ->toArray();

        $syncHCPAccessLog = SyncHCPAccessLog::query()
            ->create([
                'day' => $request->from_date,
                'user_id' => $user->id,
                'type' => SyncTypeEnum::TWO->value
            ]);

        $syncId = $syncHCPAccessLog->id;
        $userOfflineDevices = HCPDevice::query()
            ->whereIn('device_id',
                HikCentralAccessLevel::query()
                    ->whereIn('id', $request->access_level_ids ?? $accessLevels)
                    ->pluck('devices')
                    ->flatten()->values()->toArray())
            ->where('status', false)
            ->get()
            ->map(function ($item) use ($syncId) {
                return [
                    'sync_h_c_p_access_log_id' => $syncId,
                    'hik_central_device_id' => $item->device_id,
                    'name' => $item->name,
                ];
            })->values()->toArray();

        SyncOfflineDevice::query()->insert($userOfflineDevices);
        SyncEventsHCPOptimizedJob::dispatch($syncHCPAccessLog, $devices, $user, $request->from_date, $request->to_date);
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function durations(): JsonResponse
    {
        $user = auth()->user();
        $date = request('date', now()->toDateString());

        $filterQuery = $this->service->filterQuery($user);
        $durations = new DashboardPreviewController()
            ->workDurationsSql($filterQuery, $date)
            ->whereNotNull('work_times.total_minutes')
            ->select([
                'workers.id as worker_id',
                'workers.last_name',
                'workers.first_name',
                'workers.middle_name',
                'workers.photo',
                'work_times.total_minutes',
                'o.name as organization_name',
                'd.name as department_name',
                'p.name as position_name',
            ])
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($durations, LessonWorkedResource::class);

        return Helper::response(true, [
            'date' => $date,
            'data' => $data
        ]);
    }

    public function showWorkerDurations($workerId): JsonResponse
    {
        $year = request('year', now()->year);
        $month = request('month', now()->month);
        $now = Carbon::create($year, $month, 1) ?? now();
        $startDate = $now->startOfMonth()->toDateTimeString();
        $endDate = $now->endOfMonth()->toDateTimeString();

        $events = TerminalEvent::query()
            ->where('worker_id', $workerId)
            ->whereBetween('event_date_and_time', [$startDate, $endDate])
            ->orderBy('event_date_and_time')
            ->get()
            ->groupBy(fn($e) => Carbon::parse($e->event_date_and_time)->format('Y-m-d'))
            ->map(function ($dayEvents) use ($workerId) {
                $date = Carbon::parse($dayEvents->first()->event_date_and_time);
                return [
                    'worker_id' => (int)$workerId,
                    'event_date' => $date->format('Y-m-d'),
                    'daily_minutes' => (int)TurnStileHelper::calcWorkDuration($dayEvents, $date),
                ];
            })->values()->toArray();

        return Helper::response(true, $events);
    }

    public function showWorkerEventsInDay($workerId): JsonResponse
    {
        $date = request('date');
        $events = TerminalEvent::query()
            ->where('worker_id', $workerId)
            ->whereDate('event_date_and_time', $date)
            ->orderBy('event_date_and_time')
            ->get()
            ->map(fn($e) => [
                'id' => $e->id,
                'event_date_and_time' => $e->event_date_and_time,
                'device' => $e->device_name,
                'direction' => $e->direction,
                'mask_status' => $e->mask_status,
                'temperature' => $e->temperature
            ]);
        return Helper::response(true, $events);
    }

    public function newStyleEvents(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (request('download')) {
            $request->validate([
                'from' => 'required',
                'to' => 'required',
                'organizations' => 'nullable',
            ]);
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::TURNSTILE_DAILY_ATTENDANCE->value,
            ]);
            $query = $request->all();
            TurnstileEventsExportToExcelJob::dispatch($task, $query, $user->id);
            return Helper::response(trans('messages.successfully_exported'));
        }

        $date = Carbon::parse(request('date') ?? now()->toDateString());
        $start = $date->copy()->startOfDay()->toDateTimeString();
        $end = $date->copy()->endOfDay()->toDateTimeString();
        $dateString = $date->toDateString();

        // Asosiy Worker query
        $data = Worker::query()
            ->filter($user, request()->all())
            ->when(request('search'), function ($query) {
                $query->searchByFullName();
            })
            ->leftJoin('vacations as v', function ($join) use ($dateString) {
                $join->on('workers.id', '=', 'v.worker_id')
                    ->whereDate('v.to', '>=', $dateString)
                    ->whereDate('v.from', '<=', $dateString);
            })
            ->when(request('event') === 'yes', function ($query) use ($start, $end) {
                $query->whereExists(function ($sub) use ($start, $end) {
                    $sub->select(DB::raw(1))
                        ->from('terminal_events as te')
                        ->whereColumn('te.worker_id', 'workers.id')
                        ->whereBetween('te.event_date_and_time', [$start, $end]);
                });
            })
            ->when(request('event') === 'no', function ($query) use ($start, $end) {
                $query->whereNotExists(function ($sub) use ($start, $end) {
                    $sub->select(DB::raw(1))
                        ->from('terminal_events as te')
                        ->whereColumn('te.worker_id', 'workers.id')
                        ->whereBetween('te.event_date_and_time', [$start, $end]);
                });
            })
            ->select([
                'workers.id',
                'workers.last_name',
                'workers.first_name',
                'workers.middle_name',
                'workers.photo',
                DB::raw('CASE WHEN v.id IS NOT NULL THEN true ELSE false END as on_vacation'),
                DB::raw('v.from as vacation_from'),
                DB::raw('v.to as vacation_to'),
            ])
            ->with(['terminal_events' => function ($query) use ($start, $end) {
                $query->select('worker_id', 'event_date_and_time', 'direction', 'device_name')
                    ->whereBetween('event_date_and_time', [$start, $end])
                    ->orderBy('event_date_and_time');
                }
            ])
            ->paginate(request('per_page', 10));

        $data = [
            'current_page' => $data->currentPage(),
            'total' => $data->total(),
            'data' => $data->map(function ($item) use ($dateString) {
                return new WorkerTerminalEventsResource($item, $dateString);
            })
        ];
        return Helper::response(true, $data);
    }
}
