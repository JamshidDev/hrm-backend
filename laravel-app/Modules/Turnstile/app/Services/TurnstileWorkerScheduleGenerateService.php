<?php

namespace Modules\Turnstile\Services;

use App\Helpers\Helper;
use App\Helpers\TurnStileHelper;
use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Holiday;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileScheduleGroup;
use Modules\Turnstile\Models\TurnstileScheduleType;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;
use Modules\Turnstile\Transformers\WorkerSchedule\SearchWorkersWithScheduleResource;
use Throwable;

class TurnstileWorkerScheduleGenerateService
{
    public function workers(): JsonResponse
    {
        $user = auth()->user();
        $workers = WorkerPosition::query()
            ->filter($user, request()->all())
            ->when(request('search'), fn($q) => $q->whereHas('worker', fn($query) => $query->searchByFullName()))
            ->with([
                'position:id,name',
                'department:id,name',
                'worker:id,last_name,first_name,middle_name,photo',
                'scheduleType:id,name,type'
            ])
            ->when(request('department_id'), fn($q) => $q->where('department_id', request('department_id')))
            ->when(request('has_schedule') === 'No' && request('start_date') && request('end_date'),
                function ($q) {
                    $start = request('start_date');
                    $end = request('end_date');
                    $q->whereDoesntHave('scheduleDays', function ($sub) use ($start, $end) {
                        $sub->where(function ($w) use ($start, $end) {
                            $w->whereBetween('date', [$start, $end]);
                        });
                    });
                })
            ->when(request('has_schedule') === 'Yes' && request('start_date') && request('end_date'), function ($q) {
                $start = request('start_date');
                $end = request('end_date');
                $q->whereHas('scheduleDays', function ($sub) use ($start, $end) {
                    $sub->where(function ($w) use ($start, $end) {
                        $w->whereBetween('date', [$start, $end]);
                    });
                })->with('scheduleGroup:id,name,start_date,end_date');
            });

        if ($user->hasOrganizationRoles($user->organization_id, ['TimesheetHR'])) {
            $workers->whereIn('department_id',
                TimeSheetWorkerDepartment::query()
                    ->where('worker_id', $user->worker_id)
                    ->select('department_id')
            );
        }

        $workers = $workers
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate(request('per_page', 10));
        $data = PaginateResource::make($workers, SearchWorkersWithScheduleResource::class);

        return Helper::response(true, $data);
    }

    public function dayInMonth(Request $request): JsonResponse
    {
        $date = Carbon::parse($request->year . '-' . $request->month);
        $month = $date->month;
        $year = $date->year;

        $days = Cache::get('days_in_month_' . $year . '_' . $month);
        if ($days) {
            return Helper::response(true, [
                'month' => $month,
                'year' => $year,
                'days' => $days,
            ]);
        }

        $holidayDates = Holiday::query()
            ->whereBetween('holiday_date', [
                $date->startOfMonth()->toDateString(),
                $date->endOfMonth()->toDateString()])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();
        $daysInMonth = Carbon::parse("$year-$month-01")->daysInMonth;
        $days = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = Carbon::parse("$year-$month-$day");
            $days[] = [
                'day' => $day,
                'weekDay' => $date->dayOfWeek,
                'is_holiday' => in_array($date->format('Y-m-d'), $holidayDates, true)
            ];
        }

        Cache::put('days_in_month_' . $year . '_' . $month, $days);
        return Helper::response(true, [
            'month' => $month,
            'year' => $year,
            'days' => $days,
        ]);
    }

    public function generateSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date|date_format:Y-m-d',
            'end_date' => 'required|date|date_format:Y-m-d',
            'schedule_type' => 'required'
        ]);

        $schedule = TurnstileScheduleType::find($request->schedule_type);
        return match ($schedule->type) {
            1 => $this->generateScheduleByShiftWork($request, $schedule),
            2 => $this->generateScheduleByDailyWork($request, $schedule),
            5 => $this->generateScheduleByCustomWork($request),
            3 => $this->generateScheduleByPartTimeWork($request, $schedule),
            4 => $this->generateScheduleByWeekWork($request, $schedule),
            default => Helper::response(trans('messages.turnstile.schedule_type_not_found'), [], 400),
        };
    }

    public function generateScheduleByWeekWork($request, $schedule): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date|date_format:Y-m-d',
            'end_date' => 'required|date|date_format:Y-m-d',
            'work_date' => 'required|date|date_format:Y-m-d',
        ]);

        $scheduleDays = collect($schedule->days)->keyBy('day'); // 1..7
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $workDate = Carbon::parse($request->work_date); // ish haftasi boshlanishi

        $sM = $startDate->copy()->startOfMonth();
        $eM = $endDate->copy()->endOfMonth();

        $totalMinutes = 0;

        $workDays = [];
        for ($i = 1; $i <= ($request->count ?? 1); $i++) {
            $days = [];
            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {

                // work_date ga nisbatan necha kun farq bor
                $diffDays = $workDate->diffInDays($date, false); // minus bo‘lishi mumkin

                // 14 kunlik sikl ichidagi indeks (0..13)
                $cycleDay = (($diffDays % 14) + 14) % 14;

                // 0..6 -> ish haftasi, 7..13 -> dam haftasi
                $isWorkWeek = $cycleDay < 7;

                if (!$isWorkWeek) {
                    $days[] = [
                        'date' => $date->format('Y-m-d'),
                        'work_status' => false,
                        'start_time' => null,
                        'end_time' => null,
                        'daily_minutes' => 0,
                        'daytime' => 0,
                        'evening_time' => 0,
                    ];
                    continue;
                }

                // ish haftasi ichidagi kun (1..7)
                $weekDay = $cycleDay + 1;
                $pattern = $scheduleDays[$weekDay] ?? null;

                if (!$pattern || !$pattern['work_status']) {
                    $days[] = [
                        'date' => $date->format('Y-m-d'),
                        'work_status' => false,
                        'start_time' => null,
                        'end_time' => null,
                        'daily_minutes' => 0,
                        'daytime' => 0,
                        'evening_time' => 0,
                    ];
                    continue;
                }
                $days[] = [
                    'date' => $date->format('Y-m-d'),
                    'work_status' => true,
                    'start_time' => $pattern['start_time'],
                    'end_time' => $pattern['end_time'],
                    'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                    'daytime' => $pattern['daytime'] ?? 0,
                    'evening_time' => $pattern['evening_time'] ?? 0,
                ];
            }

            $sDate = $sM->copy();
            $eDate = $eM->copy();
            for ($j = $sDate;
                 $j->lte($eDate);
                 $j = $j->addDay()) {
                $d = $j->format('Y-m-d');

                if ($d < $request->start_date || $d > $request->end_date) {
                    $days[] = [
                        'date' => $d,
                        'work_status' => null
                    ];
                }
            }

            $workDays[] = $days;
        }

        $wd = [];
        foreach ($workDays as $day) {
            $wd[] = collect($day)->sortBy('date')->values()->toArray();
        }

        return Helper::response(true, [
            'work_days' => $wd,
        ]);
    }

    public function generateScheduleByPartTimeWork($request, $schedule): JsonResponse
    {
        $scheduleDays = collect($schedule->days);
        $startDateInMonth = Carbon::parse($request->start_date)->startOfMonth();
        $endDateInMonth = Carbon::parse($request->end_date)->endOfMonth();

        $workDays = [];

        for ($i = 1; $i <= ($request->count ?? 1); $i++) {
            $current = $startDateInMonth->copy();

            foreach ($scheduleDays['days'] as $scheduleDay) {
                $days = [];
                while ($current->lte($endDateInMonth)) {
                    $daysInMonth = $current->daysInMonth;
                    match ($daysInMonth) {
                        31, 30 => $dDay = 15,
                        29, 28 => $dDay = 14,
                    };
                    $addDay = 1;
                    if ($daysInMonth % 2 !== 0) {
                        $addDay = 2;
                    }

                    $start = $current->copy()->startOfMonth();
                    $end = $current->copy()->endOfMonth();
                    for ($date = $start->clone(); $date->lte($end); $date->addDay()) {
                        if ($date->day <= $dDay){
                            $pattern = $scheduleDay;
                            $days[1][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => $pattern['work_status'],
                                'start_time' => $pattern['start_time'] ?? null,
                                'end_time' => $pattern['end_time'] ?? null,
                                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                                'daytime' => $pattern['daytime'] ?? 0,
                                'evening_time' => $pattern['evening_time'] ?? 0,
                            ];
                            $days[2][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => false,
                                'start_time' => null,
                                'end_time' => null,
                                'daily_minutes' => 0,
                                'daytime' => 0,
                                'evening_time' => 0,
                            ];
                            continue;
                        }
                        if ((($daysInMonth === 31 && $date->day === 16) || ($daysInMonth === 29 && $date->day === 15))
                            && $scheduleDay['status'] === 'day') {
                            $pattern = $scheduleDays['half_day']['day1'];
                            $days[1][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => $pattern['work_status'],
                                'start_time' => $pattern['start_time'] ?? null,
                                'end_time' => $pattern['end_time'] ?? null,
                                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                            ];
                            $pattern = $scheduleDays['half_day']['day2'];
                            $days[2][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => $pattern['work_status'],
                                'start_time' => $pattern['start_time'] ?? null,
                                'end_time' => $pattern['end_time'] ?? null,
                                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                            ];
                            continue;
                        }
                        if ($date->day >= $dDay + $addDay) {
                            $pattern = $scheduleDay;
                            $days[1][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => false,
                                'start_time' => null,
                                'end_time' => null,
                                'daily_minutes' => 0,
                                'daytime' => 0,
                                'evening_time' => 0,
                            ];
                            $days[2][] = [
                                'date' => $date->format('Y-m-d'),
                                'work_status' => $pattern['work_status'],
                                'start_time' => $pattern['start_time'] ?? null,
                                'end_time' => $pattern['end_time'] ?? null,
                                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                                'daytime' => $pattern['daytime'] ?? 0,
                                'evening_time' => $pattern['evening_time'] ?? 0,
                            ];
                        }
                    }
                    $current->addMonth();
                }
                $workDays[] = $days[1];
                $workDays[] = $days[2];
            }
        }
        return Helper::response(true, [
            'work_days' => $workDays
        ]);
    }

    public function generateScheduleByCustomWork($request): JsonResponse
    {
        $startDateInMonth = Carbon::parse($request->start_date);
        $endDateInMonth = Carbon::parse($request->end_date);

        $workDays = [];
        for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
            $workDays[] = [
                'date' => $date->format('Y-m-d'),
                'work_status' => false,
                'start_time' => null,
                'end_time' => null,
                'daily_minutes' => 0,
                'daytime' => 0,
                'evening_time' => 0,
            ];
        }

        for ($j = $startDateInMonth->startOfMonth()->clone();
             $j->lte($endDateInMonth->endOfMonth()->clone());
             $j = $j->addDay()) {
            $d = $j->format('Y-m-d');

            if ($d <= $request->start_date || $d >= $request->end_date) {
                $workDays[] = [
                    'date' => $d,
                    'work_status' => null
                ];
            }
        }

        return Helper::response(true, [
            'total_hours' => 0,
            'work_days' => $workDays
        ]);

    }

    public function generateScheduleByDailyWork($request, $schedule): JsonResponse
    {
        $scheduleDays = collect($schedule->days)->keyBy('day');
        $startDateInMonth = Carbon::parse(($request->start_date));
        $endDateInMonth = Carbon::parse(($request->end_date));
        $holidayDates = Holiday::query()
            ->whereBetween('holiday_date', [$startDateInMonth, $endDateInMonth])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();
        $workDays = [];
        $totalMinutes = 0;
        $days = [];
        for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
            if ($date->dayOfWeek === 0 || in_array($date->format('Y-m-d'), $holidayDates, true)) {
                $days[] = [
                    'date' => $date->format('Y-m-d'),
                    'work_status' => false,
                    'start_time' => null,
                    'end_time' => null,
                    'daily_minutes' => 0,
                    'daytime' => 0,
                    'evening_time' => 0,
                ];
                continue;
            }
            $pattern = $scheduleDays[$date->dayOfWeek];
            $days[] = [
                'date' => $date->format('Y-m-d'),
                'work_status' => $pattern['work_status'],
                'start_time' => $pattern['start_time'] ?? null,
                'end_time' => $pattern['end_time'] ?? null,
                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                'daytime' => $pattern['daytime'] ?? 0,
                'evening_time' => $pattern['evening_time'] ?? 0,
            ];
        }

        $sDate = $startDateInMonth->copy()->startOfMonth();
        $eDate = $endDateInMonth->copy()->endOfMonth();
        for ($j = $sDate;
             $j->lte($eDate);
             $j = $j->addDay()) {
            $d = $j->format('Y-m-d');

            if ($d < $request->start_date || $d > $request->end_date) {
                $days[] = [
                    'date' => $d,
                    'work_status' => null
                ];
            }
        }

        $wd = [];
        foreach ($days as $day) {
            $wd[] = collect($day)->sortBy('date')->values()->toArray();
        }

        $totalHours = round($totalMinutes / 60, 2);
        return Helper::response(true, [
            'total_hours' => $totalHours,
            'work_days' => $wd
        ]);

    }

    public function generateScheduleByShiftWork($request, $schedule): JsonResponse
    {
        $scheduleDays = $schedule->days;
        $startDateInMonth = Carbon::parse($request->start_date);
        $endDateInMonth = Carbon::parse($request->end_date);

        $sM = $startDateInMonth->copy()->startOfMonth();
        $eM = $endDateInMonth->copy()->endOfMonth();

        $workDays = [];
        $totalMinutes = 0;
        for ($i = 1; $i <= ($request->count ?? 1); $i++) {
            foreach ($scheduleDays as $index => $day) {
                $startIndex = $index + 1;
                $days = [];

                for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
                    $startIndex = ($startIndex + 1) % count($scheduleDays);
                    $pattern = $scheduleDays[$startIndex];
                    $days[] = [
                        'date' => $date->format('Y-m-d'),
                        'work_status' => $pattern['work_status'],
                        'start_time' => $pattern['start_time'] ?? null,
                        'end_time' => $pattern['end_time'] ?? null,
                        'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                        'daytime' => $pattern['daytime'] ?? 0,
                        'evening_time' => $pattern['evening_time'] ?? 0,
                    ];

                }

                $sDate = $sM->copy();
                $eDate = $eM->copy();
                for ($j = $sDate;
                     $j->lte($eDate);
                     $j = $j->addDay()) {
                     $d = $j->format('Y-m-d');

                    if ($d < $request->start_date || $d > $request->end_date) {
                        $days[] = [
                            'date' => $d,
                            'work_status' => null
                        ];
                    }
                }

                $workDays[] = $days;
            }
        }

        $wd = [];
        foreach ($workDays as $day) {
            $wd[] = collect($day)->sortBy('date')->values()->toArray();
        }

        $totalHours = round($totalMinutes / 60, 2);
        return Helper::response(true, [
            'total_hours' => $totalHours,
            'work_days' => $wd
        ]);
    }

    public function generateScheduleByWorker(Request $request): JsonResponse
    {
        if ($request->status === 'custom'){
            $schedule = TurnstileScheduleType::where('type', 5)->first();
        } else {
            $schedule = TurnstileScheduleType::find($request->schedule_type);
        }
        return match ($schedule->type) {
            1 => $this->generateScheduleByWorkerShiftWork($request, $schedule),
            2 => $this->generateScheduleByWorkerDailyWork($request, $schedule),
            5 => $this->generateScheduleByWorkerCustomWork($request, $schedule),
            3 => $this->generateScheduleByWorkerPartTimeWork($request, $schedule),
            4 => $this->generateScheduleByWorkerWeekWork($request, $schedule),
            default => Helper::response(trans('messages.not_found'), [], 400),
        };
    }

    public function generateScheduleByWorkerWeekWork($request, $schedule): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date|date_format:Y-m-d',
            'end_date' => 'required|date|date_format:Y-m-d',
            'work_date' => 'required|date|date_format:Y-m-d',
        ]);

        $now = now()->format('Y-m-d H:i:s');
        $scheduleWorkers = collect($request->schedule_workers)
            ->whereNotNull('worker_position_id');

        $workerPositionIds = $scheduleWorkers
            ->pluck('worker_position_id')
            ->unique();

        if (!count($workerPositionIds)) {
            return Helper::response(true);
        }

        if (count($workerPositionIds) !== count($scheduleWorkers)) {
            return Helper::response(trans('messages.turnstile.unique_workers_count'), [], 400);
        }

        $workers = WorkerPosition::query()
            ->select('id', 'worker_id')
            ->whereIn('id', $workerPositionIds)
            ->get()
            ->keyBy('id');

        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->startOfDay();
        $workDate = Carbon::parse($request->work_date)->startOfDay();

        $scheduleDays = collect($schedule->days)->keyBy('day'); // 1..7
        $workDays = [];

        DB::beginTransaction();
        try {
            $group = TurnstileScheduleGroup::where('organization_id',
                auth()->user()->organization_id)
                ->where('turnstile_schedule_type_id', $schedule->id)
                ->first();
            if ($group) {
                if ($group->start_date >= $startDate->format('Y-m-d')) {
                    $group->start_date = $endDate->format('Y-m-d');
                    $group->save();
                }
                if ($group->end_date <= $startDate->format('Y-m-d')) {
                    $group->end_date = $endDate->format('Y-m-d');
                    $group->save();
                }

            } else {
                $group = TurnstileScheduleGroup::create([
                    'organization_id' => auth()->user()->organization_id,
                    'turnstile_schedule_type_id' => $schedule->id,
                    'user_id' => auth()->id(),
                    'name' => $schedule->name,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]);
            }
            foreach ($scheduleWorkers as $workerData) {

                $worker = $workers[$workerData['worker_position_id']];

                for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {

                    $diffDays = $workDate->diffInDays($date, false);
                    $cycleDay = (($diffDays % 14) + 14) % 14;
                    $isWorkWeek = $cycleDay < 7;

                    if (!$isWorkWeek) {
                        $workDays[] = $this->setWorkDays(
                            $worker,
                            $group,
                            $date->format('Y-m-d'),
                            [],
                            $now,
                            true
                        );
                        continue;
                    }

                    $weekDay = $cycleDay + 1; // 1..7
                    $pattern = $scheduleDays[$weekDay] ?? [];

                    $workDays[] = $this->setWorkDays(
                        $worker,
                        $group,
                        $date->format('Y-m-d'),
                        $pattern,
                        $now
                    );
                }
            }
            $chunks = array_chunk($workDays, 500);
            $this->insertToWorkerSchedules($chunks, $workerPositionIds, $request, $group);

        } catch (Throwable $e) {
            DB::rollBack();
            Helper::setLog($e, 'generateScheduleByWorkerWeekWork');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }

        return Helper::response(true, [
            'work_days' => $workDays
        ]);
    }

    public function generateScheduleByWorkerPartTimeWork($request, $schedule): JsonResponse
    {
        $now = now()->format('Y-m-d H:i:s');
        $scheduleDays = collect($schedule->days);

        $scheduleWorkers = collect($request->schedule_workers)->whereNotNull('worker_position_id');

        $workerPositionIds = $scheduleWorkers
            ->map(fn($item) => $item['worker_position_id'])
            ->unique();

        if (!count($workerPositionIds)) {
            return Helper::response(trans('messages.successfully_updated'));
        }

        if (count($workerPositionIds) !== count($scheduleWorkers)) {
            return Helper::response(trans('messages.turnstile.unique_workers_count'), [], 400);
        }

        $workers = WorkerPosition::query()
            ->select('id', 'worker_id')
            ->whereIn('id', $workerPositionIds)
            ->get()
            ->keyBy('id');

        $startDateInMonth = Carbon::parse($request->start_date)->startOfMonth();
        $endDateInMonth = Carbon::parse($request->end_date)->endOfMonth();

        $user = auth()->user();
        DB::beginTransaction();
        try {
            if ($request->group_id) {
                $group = TurnstileScheduleGroup::find($request->group_id);
                if (!$group) {
                    return Helper::response(trans('messages.not_found'), [], 400);
                }
            } else {
                $group = TurnstileScheduleGroup::updateOrCreate(
                    [
                        'organization_id' => $user->organization_id,
                        'turnstile_schedule_type_id' => $request->schedule_type,
                    ],
                    [
                        'user_id' => $user->id,
                        'name' => $schedule->name
                    ]
                );
            }
            if (!$group->start_date || $group->start_date >= $request->start_date) {
                $group->start_date = $request->start_date;
                $group->save();
            }
            if (!$group->end_date || $group->end_date <= $endDateInMonth->format('Y-m-d')) {
                $group->end_date = $endDateInMonth->format('Y-m-d');
                $group->save();
            }

            $workDays = [];
            foreach ($scheduleWorkers as $day) {
                $current = $startDateInMonth->copy();
                foreach ($scheduleDays['days'] as $scheduleDay) {
                    while ($current->lte($endDateInMonth)) {
                        $daysInMonth = $current->daysInMonth;
                        match ($daysInMonth) {
                            31, 30 => $dDay = 15,
                            29, 28 => $dDay = 14,
                        };
                        $addDay = 1;
                        if ($daysInMonth % 2 !== 0) {
                            $addDay = 2;
                        }

                        $start = $current->copy()->startOfMonth();
                        $end = $current->copy()->endOfMonth();
                        for ($date = $start->clone(); $date->lte($end); $date->addDay()) {
                            if ($day['day'] % 2 === 1) {
                                if ($date->day <= $dDay) {
                                    $pattern = $scheduleDay;
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), $pattern, $now);
                                    continue;
                                }

                                if ((($daysInMonth === 31 && $date->day === 16) || ($daysInMonth === 29 && $date->day === 15))
                                    && $scheduleDay['status'] === 'day') {

                                    $pattern = $scheduleDays['half_day']['day1'];
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), $pattern, $now);
                                    continue;
                                }

                                if ($date->day >= $dDay + $addDay) {
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), null, $now, true);
                                }
                            }

                            if ($day['day'] % 2 === 0) {
                                if ($date->day <= $dDay) {
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), null, $now, true);
                                    continue;
                                }
                                if ((($daysInMonth === 31 && $date->day === 16) || ($daysInMonth === 29 && $date->day === 15))
                                    && $scheduleDay['status'] === 'day') {
                                    $pattern = $scheduleDays['half_day']['day2'];
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), $pattern, $now);
                                    continue;
                                }
                                if ($date->day >= $dDay + $addDay) {
                                    $pattern = $scheduleDay;
                                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), $pattern, $now);
                                }
                            }
                        }
                        $current->addMonth();
                    }
                }
            }
            $chunks = array_chunk($workDays, 100);
            $this->insertToWorkerSchedules($chunks, $workerPositionIds, $request, $group);
        } catch (\Exception $e) {
            Helper::setLog($e,'generateScheduleByWorkerShiftWork');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
        return Helper::response(true, ['work_days' => $workDays]);
    }

    public function generateScheduleByWorkerCustomWork($request, $schedule): JsonResponse
    {
        $user = auth()->user();
        $now = now()->format('Y-m-d H:i:s');
        $scheduleWorkers = collect($request->schedule_workers)->whereNotNull('worker_position_id');
        $workerPositionIds = $scheduleWorkers
            ->map(fn($item) => $item['worker_position_id'])
            ->unique();
        if (!count($workerPositionIds)) {
            return Helper::response(trans('messages.successfully_updated'));
        }
        $allDays = $scheduleWorkers
            ->pluck('work_days')
            ->flatten(1)
            ->where('status', 'create');

        $deleteDays = $scheduleWorkers
            ->pluck('work_days')
            ->flatten(1)
            ->where('status', 'delete');

        DB::beginTransaction();
        try {
            if (count($deleteDays)) {
                TurnstileWorkerSchedule::query()
                    ->whereIn('worker_position_id', $workerPositionIds)
                    ->whereIn('date', $deleteDays->pluck('date')->toArray())
                    ->forceDelete();
            }
            if (count($allDays)) {
                $startDate = $allDays->min('date');
                $endDate = $allDays->max('date');

                $workers = WorkerPosition::query()
                    ->select('id', 'worker_id')
                    ->whereIn('id', $workerPositionIds)
                    ->get()
                    ->keyBy('id');

                if (TurnstileWorkerSchedule::query()
                    ->whereIn('worker_position_id', $workerPositionIds)
                    ->whereBetween('date', [$request->start_date, $request->end_date])
                    ->exists()) {
                    return Helper::response(trans('messages.turnstile.worker_has_schedule_in_this_period'), [], 400);
                }
                $startDateInMonth = Carbon::parse($startDate);
                $endDateInMonth = Carbon::parse($endDate);

                $group = TurnstileScheduleGroup::where('organization_id', $user->organization_id)
                    ->where('turnstile_schedule_type_id', $schedule->id)
                    ->first();
                if ($group) {
                    if ($group->start_date >= $startDateInMonth->format('Y-m-d')) {
                        $group->start_date = $startDateInMonth->format('Y-m-d');
                        $group->save();
                    }
                    if ($group->end_date <= $endDateInMonth->format('Y-m-d')) {
                        $group->end_date = $endDateInMonth->format('Y-m-d');
                        $group->save();
                    }

                } else {
                    $group = TurnstileScheduleGroup::create([
                        'organization_id' => $user->organization_id,
                        'turnstile_schedule_type_id' => $schedule->id,
                        'user_id' => $user->id,
                        'name' => $schedule->name,
                        'start_date' => $startDateInMonth->format('Y-m-d'),
                        'end_date' => $endDateInMonth->format('Y-m-d'),
                    ]);
                }
                $workDays = [];
                foreach ($request->schedule_workers as $day) {
                    foreach ($day['work_days'] as $item) {
                        if ($item['status'] === 'delete') {
                            continue;
                        }
                        $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $item['date'], $item, $now);
                    }
                }

                $chunks = array_chunk($workDays, 500);
                $this->insertToWorkerSchedules($chunks, $workerPositionIds, $request, $group);
            }
            DB::commit();
        } catch (Exception $exception) {
            DB::rollBack();
            throw TurnstileServiceException::serverError($exception->getMessage());
        }
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function generateScheduleByWorkerShiftWork($request, $schedule): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date|date_format:Y-m-d',
            'end_date' => 'required|date|date_format:Y-m-d',
        ]);
        $now = now()->format('Y-m-d H:i:s');

        $scheduleWorkers = collect($request->schedule_workers)
            ->whereNotNull('worker_position_id');
        $workerPositionIds = $scheduleWorkers
            ->map(fn($item) => $item['worker_position_id'])
            ->unique();

        if (!count($workerPositionIds)) {
            return Helper::response(trans('messages.successfully_updated'));
        }

        if (count($workerPositionIds) !== count($scheduleWorkers)) {
            return Helper::response(trans('messages.turnstile.unique_workers_count'), [], 400);
        }

        $workers = WorkerPosition::query()
            ->select('id', 'worker_id')
            ->whereIn('id', $workerPositionIds)
            ->get()
            ->keyBy('id');

        $startDateInMonth = Carbon::parse($request->start_date);
        $endDateInMonth = Carbon::parse($request->end_date);

        DB::beginTransaction();
        try {
            $group = TurnstileScheduleGroup::query()
                ->create([
                    'user_id' => auth()->id(),
                    'organization_id' => auth()->user()->organization_id,
                    'turnstile_schedule_type_id' => $request->schedule_type,
                    'name' => $schedule->name,
                    'start_date' => $startDateInMonth->format('Y-m-d'),
                    'end_date' => $endDateInMonth->format('Y-m-d'),
                ]);
            $scheduleDays = $schedule->days;
            $workDays = [];
            foreach ($scheduleWorkers as $day) {
                $startIndex = $day['day'];
                for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
                    $startIndex = ($startIndex + 1) % count($scheduleDays);
                    $pattern = $scheduleDays[$startIndex];
                    $workDays[] = $this->setWorkDays($workers[$day['worker_position_id']], $group, $date->format('Y-m-d'), $pattern, $now);
                }
            }
            $chunks = array_chunk($workDays, 500);
            $this->insertToWorkerSchedules($chunks, $workerPositionIds, $request, $group);
        } catch (Exception $exception) {
            DB::rollBack();
            Helper::setLog($exception,'generateScheduleByWorkerShiftWork');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
        return Helper::response(true, ['work_days' => $workDays]);
    }

    public function generateScheduleByWorkerDailyWork($request, $schedule): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date|date_format:Y-m-d',
            'end_date' => 'required|date|date_format:Y-m-d',
        ]);

        $workerPositionIds = array_unique($request->worker_position_ids);

        if (count($workerPositionIds) !== count($request->worker_position_ids)) {
            return Helper::response(trans('messages.turnstile.unique_workers_count'), [], 400);
        }

        if (!count($workerPositionIds)) {
            return Helper::response(trans('messages.successfully_updated'));
        }

        $workers = WorkerPosition::query()
            ->select('id', 'worker_id')
            ->whereIn('id', $workerPositionIds)
            ->get()
            ->keyBy('id');


        $startDateInMonth = Carbon::parse($request->start_date);
        $endDateInMonth = Carbon::parse($request->end_date);

        $user = auth()->user();
        if ($request->group_id) {
            $group = TurnstileScheduleGroup::find($request->group_id);
            if (!$group) {
                return Helper::response(trans('messages.not_found'), [], 400);
            }
        } else {
            $group = TurnstileScheduleGroup::updateOrCreate(
                [
                    'organization_id' => $user->organization_id,
                    'turnstile_schedule_type_id' => $request->schedule_type,
                ],
                [
                    'user_id' => $user->id,
                    'name' => $schedule->name
                ]
            );
        }

        if (!$group->start_date || $group->start_date >= $request->start_date) {
            $group->start_date = $request->start_date;
            $group->save();
        }
        if (!$group->end_date || $group->end_date <= $endDateInMonth->format('Y-m-d')) {
            $group->end_date = $endDateInMonth->format('Y-m-d');
            $group->save();
        }

        $holidayDates = Holiday::query()
            ->whereBetween('holiday_date', [$startDateInMonth, $endDateInMonth])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        DB::beginTransaction();
        try {
            $scheduleDays = collect($schedule->days)->keyBy('day');
            $workDays = [];
            foreach ($workers as $worker) {
                for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
                    $dayOffWeek = $date->dayOfWeek;
                    if ($dayOffWeek === 0) {
                        $dayOffWeek = 7;
                    }
                    $pattern = $scheduleDays[$dayOffWeek];
                    if (!array_key_exists('holiday', $pattern)
                        && ($date->dayOfWeek === 0 || in_array($date->format('Y-m-d'), $holidayDates, true))) {

                        $workDays[] = $this->setWorkDays($worker, $group, $date->format('Y-m-d'), null, now()->toDateTimeString(), true);
                        continue;
                    }
                    $workDays[] = $this->setWorkDays($worker, $group, $date->format('Y-m-d'), $pattern, now()->toDateTimeString());
                }
            }
            $chunks = array_chunk($workDays, 300);
            $this->insertToWorkerSchedules($chunks, $workerPositionIds, $request, $group);
            return Helper::response(trans('messages.successfully_updated'), ['work_days' => $workDays]);
        } catch (Exception $exception) {
            DB::rollBack();
            Helper::setLog($exception, 'TurnstileScheduleController@generateScheduleByWorkerDailyWork');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function refreshWorkersCountInGroup($group): void
    {
        if ($group) {
            if (config('app.env') === 'production') {
                \Illuminate\Support\defer(function () use ($group) {

                    $workersCount = $group->loadCount(['workers as workers_count_in_group' => function ($q) {
                        $q->select(DB::raw('COUNT(DISTINCT worker_id)'));
                    }])->workers_count_in_group;
                    $group->update(['workers_count' => $workersCount]);
                    if ($group->workers_count === 0) {
                        $group->delete();
                    }
                });
            } else {
                $workersCount = $group->loadCount(['workers as workers_count_in_group' => function ($q) {
                    $q->select(DB::raw('COUNT(DISTINCT worker_id)'));
                }])->workers_count_in_group;
                $group->update(['workers_count' => $workersCount]);
                if ($group->workers_count === 0) {
                    $group->delete();
                }
            }
        }

    }

    public function setWorkDays($workerPosition, $group, $date, $pattern, $now, $dayOff = false): array
    {
        if (!$dayOff) {
            return [
                'turnstile_schedule_group_id' => $group?->id,
                'worker_id' => $workerPosition?->worker_id,
                'worker_position_id' => $workerPosition?->id,
                'date' => $date,
                'work_status' => $pattern['work_status'] ?? false,
                'start_time' => $pattern['start_time'] ?? null,
                'end_time' => $pattern['end_time'] ?? null,
                'daily_minutes' => $pattern['daily_minutes'] ?? 0,
                'daytime' => $pattern['daytime'] ?? 0,
                'evening_time' => $pattern['evening_time'] ?? 0,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }

        return [
            'turnstile_schedule_group_id' => $group?->id,
            'worker_id' => $workerPosition?->worker_id,
            'worker_position_id' => $workerPosition?->id,
            'date' => $date,
            'work_status' => false,
            'start_time' => null,
            'end_time' => null,
            'daily_minutes' => 0,
            'daytime' => 0,
            'evening_time' => 0,
            'created_at' => $now,
            'updated_at' => $now
        ];
    }

    public function replacementWorkers(Request $request): ?JsonResponse
    {
        $request->validate([
            'worker_1' => 'required|integer',
            'worker_position_1' => 'required|integer',
            'worker_2' => 'required|integer',
            'worker_position_2' => 'required|integer',
            'date' => 'required|date',
            'status' => 'required|boolean'
        ]);

        DB::beginTransaction();
        try {
            $workerOneDays = TurnstileWorkerSchedule::where('worker_id', $request->worker_1)
                ->where('worker_position_id', $request->worker_position_1)
                ->when($request->status, fn($q) => $q->where('date', $request->date))
                ->when(!$request->status, fn($q) => $q->where('date', '>=', $request->date))
                ->get();

            // Old qatorlarni butunlay delete (unique problemasi bo‘lmasligi uchun)
            TurnstileWorkerSchedule::where('worker_id', $request->worker_1)
                ->where('worker_position_id', $request->worker_position_1)
                ->when($request->status, fn($q) => $q->where('date', $request->date))
                ->when(!$request->status, fn($q) => $q->where('date', '>=', $request->date))
                ->forceDelete();

            TurnstileWorkerSchedule::where('worker_id', $request->worker_2)
                ->where('worker_position_id', $request->worker_position_2)
                ->when($request->status, fn($q) => $q->where('date', $request->date))
                ->when(!$request->status, fn($q) => $q->where('date', '>=', $request->date))
                ->update([
                    'worker_id' => $request->worker_1,
                    'worker_position_id' => $request->worker_position_1
                ]);

            // Endi worker_1 bo'lgan eski qatorlarni worker_2 qilib qaytarib qo'yamiz
            foreach ($workerOneDays as $row) {
                $newItem = $row->replicate(); // to'g'ri clone
                $newItem->worker_id = $request->worker_2;
                $newItem->worker_position_id = $request->worker_position_2;
                $newItem->save();
            }

            DB::commit();
            return Helper::response(trans('messages.successfully_updated'));
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e, 'TurnstileWorkerScheduleController@replacementWorkers');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }

    }

    public function generateTurnstileSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'worker_position_id' => 'required|integer',
            'date' => 'required|date|date_format:Y-m-d',
        ]);
        $date = Carbon::parse($request->date);
        if ($date->isCurrentMonth()){
            $endDate = now()->subDay();
        } else {
            $endDate = $date->copy()->endOfMonth();
        }

        if ($date->isToday()) {
            $startDate = now()->subDay();
        } else {
            $startDate = $date;
        }

        DB::beginTransaction();
        try {
            $workerEvents = TerminalEvent::query()
                ->where('worker_position_id', $request->worker_position_id)
                ->where('event_date_and_time', '>=', $startDate->format('Y-m-d H:i:s'))
                ->where('event_date_and_time', '<=', $endDate->format('Y-m-d H:i:s'))
                ->orderBy('event_date_and_time')
                ->get();

            $eventsByDay = $workerEvents->groupBy(function ($item) {
                return Carbon::parse($item->event_date_and_time)->format('Y-m-d');
            });

            $data = [];
            foreach ($eventsByDay as $d => $events) {
                $times = TurnStileHelper::calcWorkDurationDetailed($events, $d);
                $data[] = [
                    'worker_position_id' => $request->worker_position_id,
                    'date' => $d,
                    'fact_daily_minutes' => $times['fact_daily_minutes'],
                    'fact_daytime' => $times['fact_daytime'],
                    'fact_evening_time' => $times['fact_evening_time'],
                ];
            }

            $workers = TurnstileWorkerSchedule::query()
                ->where('worker_position_id', $request->worker_position_id)
                ->where('date', '>=', $startDate->format('Y-m-d'))
                ->where('date', '<=', $endDate->format('Y-m-d'))
                ->get();

            $times = collect($data);
            foreach ($workers as $w) {
                $time = $times->firstWhere('date', $w->date);
                if ($time) {
                    $w->fact_daily_minutes = round($time['fact_daily_minutes']);
                    $w->fact_daytime = round($time['fact_daytime']);
                    $w->fact_evening_time = round($time['fact_evening_time']);
                    $w->save();
                }
            }
            DB::commit();
            return Helper::response(trans('messages.successfully_updated'));
        } catch (Exception $e) {
            DB::rollBack();
            throw TurnstileServiceException::serverError($e->getMessage());
        }
    }

    private function insertToWorkerSchedules(array $chunks, $workerPositionIds, $request, $group): void
    {
        foreach ($chunks as $chunk) {
            $chunk = collect($chunk)
                ->filter(fn($item) => $item['date'] <= '2028-12-31')
                ->values()
                ->toArray();
            TurnstileWorkerSchedule::upsert(
                $chunk,
                ['worker_id', 'worker_position_id', 'date'],
                ['turnstile_schedule_group_id', 'work_status', 'start_time', 'end_time', 'daily_minutes', 'daytime', 'evening_time']
            );
        }
        WorkerPosition::query()
            ->whereIn('id', $workerPositionIds)
            ->update([
                'turnstile_schedule_type_id' => $request->schedule_type,
                'turnstile_schedule_group_id' => $group->id
            ]);
        DB::commit();
        DB::afterCommit(function () use ($group) {
            $this->refreshWorkersCountInGroup($group);
        });
    }
}
