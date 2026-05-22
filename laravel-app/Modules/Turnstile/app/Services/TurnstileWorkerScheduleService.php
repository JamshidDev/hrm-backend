<?php

namespace Modules\Turnstile\Services;

use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Holiday;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;
use Modules\Turnstile\Models\TurnstileScheduleType;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;
use Modules\Turnstile\Models\WorkerPositionTurnstilePrivilege;
use Modules\Turnstile\Transformers\WorkerSchedule\WorkerScheduleResource;
use Modules\Turnstile\Transformers\WorkerSchedule\WorkerScheduleWithTurnstileResource;

class TurnstileWorkerScheduleService
{
    public function generatePreview(array $data): array
    {
        $schedule = TurnstileScheduleType::findOrFail($data['schedule_type']);
        $scheduleDays = $schedule->days;

        $startDateInMonth = Carbon::parse($data['start_date'])->startOfMonth();
        $endDateInMonth = Carbon::parse($data['start_date'])->endOfMonth();

        $holidayDates = Holiday::query()
            ->whereBetween('holiday_date', [$startDateInMonth, $endDateInMonth])
            ->pluck('holiday_date')
            ->map(fn($date) => Carbon::parse($date)->format('Y-m-d'))
            ->toArray();

        $startIndex = $schedule->type === 2
            ? 0
            : ($data['start_day_in_schedule_types'] - 1) % count($scheduleDays);

        $workDays = [];
        $totalMinutes = 0;

        for ($date = $startDateInMonth->clone(); $date->lte($endDateInMonth); $date->addDay()) {
            if ($schedule->type === 2) {
                $startIndex = $date->dayOfWeek - 1;

                if (in_array($date->format('Y-m-d'), $holidayDates, true) || $date->isWeekend()) {
                    $workDays[] = [
                        'date' => $date->format('Y-m-d'),
                        'work_status' => false,
                        'start_time' => null,
                        'end_time' => null,
                        'daily_minutes' => 0,
                    ];
                    continue;
                }
            }

            $pattern = $scheduleDays[$startIndex];
            $startTime = null;
            $endTime = null;
            $dailyMinutes = 0;

            if ($pattern['work_status']) {
                $shiftStart = Carbon::parse($date->format('Y-m-d') . ' ' . $pattern['start_time']);
                $shiftEnd = $pattern['end_time'] === '00:00'
                    ? Carbon::parse($date->format('Y-m-d') . ' 24:00')
                    : Carbon::parse($date->format('Y-m-d') . ' ' . $pattern['end_time']);

                if ($shiftEnd < $shiftStart) {
                    $shiftEnd->addDay();
                }

                $dailyMinutes = abs($shiftEnd->diffInMinutes($shiftStart));

                if (!empty($pattern['break_times'])) {
                    $breakStart = Carbon::parse($date->format('Y-m-d') . ' ' . $pattern['break_times']['start_time']);
                    $breakEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $pattern['break_times']['end_time']);

                    if ($breakEnd < $breakStart) {
                        $breakEnd->addDay();
                    }

                    $dailyMinutes -= abs($breakEnd->diffInMinutes($breakStart));
                }

                $totalMinutes += $dailyMinutes;
                $startTime = $pattern['start_time'];
                $endTime = $pattern['end_time'];
            }

            $workDays[] = [
                'date' => $date->format('Y-m-d'),
                'work_status' => $pattern['work_status'],
                'start_time' => $startTime,
                'end_time' => $endTime,
                'daily_minutes' => $dailyMinutes,
            ];

            if ($schedule->type !== 2) {
                $startIndex = ($startIndex + 1) % count($scheduleDays);
            }
        }

        return [
            'total_hours' => round($totalMinutes / 60, 2),
            'work_days' => $workDays,
        ];
    }

    public function paginate(array $filters, $user)
    {
        $date = Carbon::parse($filters['date']);
        $start = $date->copy()->startOfMonth()->format('Y-m-d');
        $end = $date->copy()->endOfMonth()->format('Y-m-d');

        $workers = $this->baseWorkerQuery($filters, $user, $start, $end)
            ->with([
                'organization:id,name,name_ru,name_en,group',
                'position:id,name',
                'department:id,name,level',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
                'scheduleType'
            ])
            ->with('scheduleDays', function ($query) use ($start, $end) {
                $query->selectRaw("
                    id,
                    turnstile_schedule_group_id,
                    worker_position_id,
                    worker_id,
                    date,
                    work_status,
                    to_char(turnstile_worker_schedules.start_time, 'HH24:MI') as start_time,
                    to_char(turnstile_worker_schedules.end_time, 'HH24:MI') as end_time,
                    daily_minutes,
                    daytime,
                    evening_time,
                    fact_daily_minutes,
                    fact_daytime,
                    fact_evening_time
                ")->whereBetween('date', [$start, $end]);
            });

        $workers = $this->applyTimesheetRoleFilter($workers, $user)
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($workers, WorkerScheduleResource::class);
    }

    public function paginateWithTurnstile(array $filters, $user)
    {
        $date = Carbon::parse($filters['date']);
        $startOfMonth = $date->copy()->startOfMonth();
        $start = $startOfMonth->format('Y-m-d');
        $end = $date->copy()->endOfMonth()->format('Y-m-d');
        $endOfMonth = $date->copy()->addMonth()->startOfMonth();

        $workers = $this->baseWorkerQuery($filters, $user, $start, $end)
            ->with([
                'organization:id,name,name_ru,name_en,group',
                'position:id,name',
                'department:id,name,level',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
                'scheduleType',
                'terminal_events' => fn($query) => $query->whereBetween('event_date_and_time', [
                    $startOfMonth->format('Y-m-d H:i:s'),
                    $endOfMonth->format('Y-m-d H:i:s')
                ]),
            ])
            ->with('scheduleDays', function ($query) use ($start, $end) {
                $query->selectRaw("
                    id,
                    turnstile_schedule_group_id,
                    worker_position_id,
                    worker_id,
                    date,
                    work_status,
                    to_char(turnstile_worker_schedules.start_time, 'HH24:MI') as start_time,
                    to_char(turnstile_worker_schedules.end_time, 'HH24:MI') as end_time,
                    daily_minutes,
                    daytime,
                    evening_time,
                    fact_daily_minutes,
                    fact_daytime,
                    fact_evening_time
                ")->whereBetween('date', [$start, $end]);
            });

        $workers = $this->applyTimesheetRoleFilter($workers, $user)
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($workers, WorkerScheduleWithTurnstileResource::class);
    }

    public function update(int $workerPositionId, array $data): void
    {
        $workerPosition = WorkerPosition::query()->findOrFail($workerPositionId);

        if (array_key_exists('is_turnstile', $data)) {
            $workerPosition->is_turnstile = $data['is_turnstile'];
            WorkerPositionTurnstilePrivilege::query()->updateOrCreate(
                ['worker_position_id' => $workerPositionId, 'type' => 'is_turnstile'],
                ['comment' => $data['comment'] ?? null]
            );
        }

        if (array_key_exists('start_minute', $data)) {
            $workerPosition->turnstile_privilege_start_minute = $data['start_minute'];
            WorkerPositionTurnstilePrivilege::query()->updateOrCreate(
                ['worker_position_id' => $workerPositionId, 'type' => 'turnstile_privilege'],
                ['comment' => $data['comment'] ?? null]
            );
        } else {
            $workerPosition->turnstile_privilege_start_minute = 0;
        }

        if (array_key_exists('end_minute', $data)) {
            $workerPosition->turnstile_privilege_end_minute = $data['end_minute'];
            WorkerPositionTurnstilePrivilege::query()->updateOrCreate(
                ['worker_position_id' => $workerPositionId, 'type' => 'turnstile_privilege'],
                ['comment' => $data['comment'] ?? null]
            );
        } else {
            $workerPosition->turnstile_privilege_end_minute = 0;
        }

        if (!array_key_exists('start_minute', $data) || !array_key_exists('end_minute', $data)) {
            WorkerPositionTurnstilePrivilege::query()
                ->where('worker_position_id', $workerPositionId)
                ->delete();
        }

        $workerPosition->save();
    }

    public function store(array $data): void
    {
        set_time_limit(60);

        foreach ($data['days'] as $day) {
            WorkerPosition::query()
                ->whereIn('id', $day['worker_position_ids'])
                ->update(['turnstile_schedule_type_id' => $day['schedule_type']]);

            $workerPositions = WorkerPosition::query()
                ->whereIn('id', $day['worker_position_ids'])
                ->get();

            $now = now();
            $insertData = [];

            foreach ($workerPositions as $workerPosition) {
                foreach ($day['work_days'] as $workDay) {
                    $insertData[] = [
                        'worker_position_id' => $workerPosition->id,
                        'worker_id' => $workerPosition->worker_id,
                        'date' => $workDay['date'],
                        'work_status' => $workDay['work_status'],
                        'start_time' => $workDay['start_time'],
                        'end_time' => $workDay['end_time'],
                        'daily_minutes' => (int)$workDay['daily_minutes'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            $date = Carbon::parse($data['date']);
            TurnstileWorkerSchedule::query()
                ->whereBetween('date', [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()])
                ->whereIn('worker_position_id', $day['worker_position_ids'])
                ->forceDelete();

            foreach (array_chunk($insertData, 200) as $chunk) {
                TurnstileWorkerSchedule::insertOrIgnore($chunk);
            }
        }
    }

    public function show(int $workerPositionId, array $data)
    {
        $date = Carbon::parse($data['date']);

        return TurnstileWorkerSchedule::query()
            ->where('worker_position_id', $workerPositionId)
            ->whereBetween('date', [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()])
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'work_status' => $item->work_status,
                    'start_time' => $item->start_time,
                    'end_time' => $item->end_time,
                ];
            });
    }

    private function baseWorkerQuery(array $filters, $user, string $start, string $end)
    {
        return WorkerPosition::query()
            ->filter($user, $filters)
            ->when($filters['department_id'] ?? null, fn($query, $departmentId) => $query->where('department_id', $departmentId))
            ->when($filters['schedule_type'] ?? null, fn($query, $scheduleType) => $query->where('turnstile_schedule_type_id', $scheduleType))
            ->select(
                'id',
                'worker_id',
                'position_id',
                'department_id',
                'organization_id',
                'turnstile_schedule_type_id',
                'is_turnstile',
                'turnstile_privilege_start_minute',
                'turnstile_privilege_end_minute'
            )
            ->when(($filters['has_schedule'] ?? null) === 'No', function ($query) use ($start, $end) {
                $query->whereDoesntHave('scheduleDays', fn($subQuery) => $subQuery->whereBetween('date', [$start, $end]));
            })
            ->when(($filters['has_schedule'] ?? null) === 'Yes', function ($query) use ($start, $end) {
                $query->whereHas('scheduleDays', fn($subQuery) => $subQuery->whereBetween('date', [$start, $end]));
            })
            ->when($filters['search'] ?? null, fn($query) => $query->whereHas('worker', fn($workerQuery) => $workerQuery->searchByFullName()));
    }

    private function applyTimesheetRoleFilter($workers, $user)
    {
        if ($user->hasOrganizationRoles($user->organization_id, ['TimesheetHR'])) {
            $workers->whereIn('department_id', TimeSheetWorkerDepartment::query()
                ->where('worker_id', $user->worker_id)
                ->select('department_id'));
        }

        return $workers;
    }
}
