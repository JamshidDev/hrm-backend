<?php

namespace App\Services\Mobile;

use App\Helpers\TurnStileHelper;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class UserScheduleStatsService
{
    public function monthStat(User $user, string $type, int $year, int $month): array
    {
        [$startOfMonth, $endOfMonth] = $this->monthBounds($year, $month);

        $workerPosition = WorkerPosition::query()
            ->where('worker_id', $user->worker_id)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->first();

        $schedules = TurnstileWorkerSchedule::query()
            ->where('worker_id', $user->worker_id)
            ->whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->where('worker_position_id', $workerPosition?->id)
            ->get();

        $events = TerminalEvent::query()
            ->where('worker_id', $user->worker_id)
            ->whereBetween('event_date_and_time', [$startOfMonth, $endOfMonth])
            ->orderBy('event_date_and_time')
            ->get()
            ->groupBy(fn($e) => Carbon::parse($e->event_date_and_time)->toDateString());

        $list = [];

        foreach ($schedules as $schedule) {
            if (!$schedule->work_status) {
                continue;
            }

            $entry = $this->buildEntry($schedule, $events[$schedule->date] ?? collect(), $type);

            if ($entry !== null) {
                $list[] = $entry;
            }
        }

        return [
            'type' => $type,
            'count' => count($list),
            'list' => $list,
        ];
    }

    public function turnstileEvents(User $user, Carbon $date, ?string $style): array
    {
        if ($style === 'month' || $style === 'week') {
            return [
                'style' => $style,
                'events' => $this->aggregatedDailyDuration($user->worker_id, $date, $style),
            ];
        }

        $startDatetime = $date->copy()->startOfDay()->toDateTimeString();
        $endDatetime = $date->copy()->addDay()->startOfDay()->toDateTimeString();

        $events = TerminalEvent::query()
            ->with('access_level:id,name')
            ->where('worker_id', $user->worker_id)
            ->where('event_date_and_time', '>=', $startDatetime)
            ->where('event_date_and_time', '<', $endDatetime)
            ->get();

        return [
            'style' => $style,
            'events' => $events,
            'duration' => TurnStileHelper::calcWorkDuration($events, $date),
        ];
    }

    public function mySchedules(User $user, int $workerPositionId, int $year, int $month): Collection
    {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->addMonth()->toDateString();

        return TurnstileWorkerSchedule::query()
            ->where('worker_id', $user->worker_id)
            ->where('worker_position_id', $workerPositionId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate])
            ->get()
            ->map(fn($schedule) => [
                'date' => $schedule->date,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'is_work' => $schedule->work_status,
            ]);
    }

    private function monthBounds(int $year, int $month): array
    {
        $now = Carbon::create($year, $month, 1);
        $startOfMonth = $now->copy()->startOfMonth();

        $endOfMonth = ($now->year === now()->year && now()->month === $now->month)
            ? now()
            : $now->copy()->endOfMonth();

        return [$startOfMonth, $endOfMonth];
    }

    private function buildEntry(TurnstileWorkerSchedule $schedule, $dayEvents, string $type): ?array
    {
        $date = $schedule->date;
        $firstEntry = $dayEvents->where('direction', true)->first();
        $lastExit = $dayEvents->where('direction', false)->last();

        $startDateTime = Carbon::parse($date . ' ' . $schedule->start_time);
        $endDateTime = Carbon::parse($date . ' ' . $schedule->end_time);

        return match ($type) {
            'absent' => $firstEntry ? null : [
                'date' => $date,
                'start' => $startDateTime,
                'end' => $endDateTime,
            ],
            'late' => $firstEntry && $startDateTime->lt(Carbon::parse($firstEntry->event_date_and_time))
                ? [
                    'date' => $date,
                    'arrival_time' => Carbon::parse($firstEntry->event_date_and_time),
                    'schedule_start' => $startDateTime,
                ]
                : null,
            'early' => $firstEntry && Carbon::parse($firstEntry->event_date_and_time)->lt($startDateTime)
                ? [
                    'date' => $date,
                    'arrival_time' => Carbon::parse($firstEntry->event_date_and_time),
                    'schedule_start' => $startDateTime,
                ]
                : null,
            'leave' => $lastExit && Carbon::parse($lastExit->event_date_and_time)->lt($endDateTime)
                ? [
                    'date' => $date,
                    'leave_time' => Carbon::parse($lastExit->event_date_and_time),
                    'schedule_end' => $endDateTime,
                ]
                : null,
            'entry' => $firstEntry ? [
                'date' => $date,
                'arrival_time' => $firstEntry->event_date_and_time,
            ] : null,
            default => null,
        };
    }

    private function aggregatedDailyDuration(int $workerId, Carbon $date, string $style): array
    {
        if ($style === 'month') {
            $startDatetime = $date->copy()->startOfMonth()->toDateTimeString();
            $endDatetime = $date->copy()->endOfMonth()->toDateTimeString();
        } else {
            $startDatetime = $date->copy()->subDays(7)->toDateTimeString();
            $endDatetime = $date->copy()->toDateTimeString();
        }

        return TerminalEvent::query()
            ->where('worker_id', $workerId)
            ->whereBetween('event_date_and_time', [$startDatetime, $endDatetime])
            ->orderBy('event_date_and_time')
            ->get()
            ->groupBy(fn($e) => Carbon::parse($e->event_date_and_time)->format('Y-m-d'))
            ->map(function ($dayEvents) {
                $date = Carbon::parse($dayEvents->first()->event_date_and_time);
                return [
                    'event_date' => $date->format('Y-m-d'),
                    'daily_minutes' => (int)TurnStileHelper::calcWorkDuration($dayEvents, $date),
                ];
            })
            ->values()
            ->toArray();
    }
}
