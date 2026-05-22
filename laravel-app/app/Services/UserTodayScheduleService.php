<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class UserTodayScheduleService
{
    public function getTodayScheduleStats(User $user, ?Carbon $now = null): array
    {
        $now = ($now ?: now())->copy();
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();
        $tomorrow = $now->copy()->addDay()->toDateString();

        $workerPosition = WorkerPosition::where('worker_id', $user->worker_id)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)->first();

        $schedules = TurnstileWorkerSchedule::query()
            ->where('worker_id', $user->worker_id)
            ->whereBetween('date', [$yesterday, $tomorrow])
            ->where('worker_position_id', $workerPosition?->id)
            ->get();

        $events = TerminalEvent::query()
            ->where('worker_id', $user->worker_id)
            ->whereBetween('event_date_and_time', [
                Carbon::parse($yesterday)->startOfDay()->toDateTimeString(),
                Carbon::parse($tomorrow)->endOfDay()->toDateTimeString(),
            ])
            ->orderBy('event_date_and_time')
            ->get()
            ->map(function ($event) {
                $event->event_at = Carbon::parse($event->event_date_and_time);
                return $event;
            });

        $dayStats = [];

        $todaySchedule = $schedules->firstWhere('date', $today);
        $workerPositionDayStats = $this->buildWorkerPositionDayStats(
            $workerPosition?->id,
            $schedules,
            $todaySchedule,
            $events,
            $now
        );

        if ($workerPositionDayStats) {
            $dayStats[] = $workerPositionDayStats;
        }

        if (!$dayStats || !$workerPosition) {
            $dayStats[] = [
                'worker_position_id' => null,
                'date' => $today,
                'work_day' => true,
                'schedule' => [
                    'start' => null,
                    'end' => null,
                    'type' => null,
                ],
                'turnstile' => [
                    'first_entry' => null,
                    'last_exit' => null,
                ],
                'note' => trans('messages.mobile.turnstile_stats.schedule_not_found'),
            ];
        }

        return [
            'day_stats' => $dayStats,
            'month_stats' => $this->calculateMonthStats($workerPosition, $now),
        ];
    }

    private function buildWorkerPositionDayStats(
        int|string|null $workerPositionId,
        Collection      $items,
                        $todaySchedule,
        Collection      $events,
        Carbon          $now
    ): ?array
    {
        $today = $now->toDateString();
        if (!$todaySchedule || !$todaySchedule->work_status) {
            [$firstEntry, $lastExit] = $this->resolveDailyEvents($events, $now->copy()->startOfDay(), $now->copy()->endOfDay());

            return [
                'worker_position_id' => $workerPositionId,
                'date' => $today,
                'work_day' => false,
                'schedule' => null,
                'turnstile' => [
                    'first_entry' => $firstEntry?->event_date_and_time,
                    'last_exit' => $lastExit?->event_date_and_time,
                ],
                'arrival_status' => null,
                'arrival_message' => null,
                'leave_status' => null,
                'leave_message' => null,
            ];
        }

        $scheduleWindow = $this->resolveScheduleWindow($items, $todaySchedule);
        $type = $scheduleWindow['type'];

        [$firstEntry, $lastExit] = $this->resolveWindowEvents(
            $events,
            $scheduleWindow['lookup_start'],
            $scheduleWindow['lookup_end']
        );

        if ($type === 'broken') {
            return [
                'worker_position_id' => $workerPositionId,
                'date' => $today,
                'work_day' => true,
                'schedule' => [
                    'day_time' => $todaySchedule->daytime,
                    'evening_time' => $todaySchedule->evening_time,
                ],
                'turnstile' => [
                    'first_entry' => $firstEntry?->event_date_and_time,
                    'last_exit' => $lastExit?->event_date_and_time,
                ],
                'note' => trans('messages.mobile.turnstile_stats.schedule_not_found'),
            ];
        }

        $startDateTime = $scheduleWindow['start'];
        $endDateTime = $scheduleWindow['end'];

        if (!$startDateTime || !$endDateTime) {
            return null;
        }

        if ($now->lt($startDateTime)) {
            $arrivalStatus = 'not_started';
            $arrivalMessage = trans('messages.mobile.turnstile_stats.start_time_not_started');
            $leaveStatus = 'not_started';
            $leaveMessage = trans('messages.mobile.turnstile_stats.start_time_not_started');
        } else {
            if (!$firstEntry) {
                $arrivalStatus = 'absent';
                $arrivalMessage = trans('messages.mobile.turnstile_stats.start_event_not_found');
            } else {
                $arrivalTime = $firstEntry->event_at;

                if ($arrivalTime->lt($startDateTime)) {
                    $arrivalStatus = 'early';
                    $arrivalMessage = trans('messages.mobile.turnstile_stats.start_event_plus');
                } elseif ($arrivalTime->gt($startDateTime)) {
                    $arrivalStatus = 'late';
                    $arrivalMessage = trans('messages.mobile.turnstile_stats.start_event_minus');
                } else {
                    $arrivalStatus = 'on_time';
                    $arrivalMessage = trans('messages.mobile.turnstile_stats.start_event');
                }
            }

            if ($now->lt($endDateTime)) {
                $leaveStatus = 'not_ended';
                $leaveMessage = trans('messages.mobile.turnstile_stats.end_time_not_started');
            } elseif (!$lastExit) {
                $leaveStatus = 'not_left';
                $leaveMessage = trans('messages.mobile.turnstile_stats.end_event_not_found');
            } else {
                $leaveTime = $lastExit->event_at;

                if ($leaveTime->lt($endDateTime)) {
                    $leaveStatus = 'early_leave';
                    $leaveMessage = trans('messages.mobile.turnstile_stats.end_time_minus');
                } else {
                    $leaveStatus = 'normal_leave';
                    $leaveMessage = trans('messages.mobile.turnstile_stats.end_time');
                }
            }
        }

        return [
            'worker_position_id' => $workerPositionId,
            'date' => $today,
            'work_day' => true,
            'schedule' => [
                'start' => $startDateTime->format('Y-m-d H:i:s'),
                'end' => $endDateTime->format('Y-m-d H:i:s'),
                'type' => $type,
            ],
            'turnstile' => [
                'first_entry' => $firstEntry?->event_date_and_time,
                'last_exit' => $lastExit?->event_date_and_time,
            ],
            'arrival_status' => $arrivalStatus,
            'arrival_message' => $arrivalMessage,
            'leave_status' => $leaveStatus,
            'leave_message' => $leaveMessage,
        ];
    }

    private function resolveScheduleWindow(Collection $items, $todaySchedule): array
    {
        $today = Carbon::parse($todaySchedule->date);
        $yesterday = $today->copy()->subDay()->toDateString();
        $tomorrow = $today->copy()->addDay()->toDateString();
        $startTime = (string)$todaySchedule->start_time;
        $endTime = (string)$todaySchedule->end_time;

        $type = match (true) {
            $startTime === '00:00:00' && $endTime !== '00:00:00' => 'night_end',
            $startTime !== '00:00:00' && $endTime === '00:00:00' => 'night_start',
            $startTime !== '00:00:00' && $endTime !== '00:00:00' => 'day',
            default => 'broken',
        };

        if ($type === 'night_end') {
            $yesterdaySchedule = $items->firstWhere('date', $yesterday);
            $startDateTime = $yesterdaySchedule && $yesterdaySchedule->start_time !== '00:00:00'
                ? Carbon::parse($yesterday . ' ' . $yesterdaySchedule->start_time)
                : $today->copy()->startOfDay();
            $endDateTime = Carbon::parse($today->toDateString() . ' ' . $endTime);
        } elseif ($type === 'night_start') {
            $startDateTime = Carbon::parse($today->toDateString() . ' ' . $startTime);
            $tomorrowSchedule = $items->firstWhere('date', $tomorrow);
            $endDateTime = $tomorrowSchedule && $tomorrowSchedule->end_time !== '00:00:00'
                ? Carbon::parse($tomorrow . ' ' . $tomorrowSchedule->end_time)
                : $today->copy()->addDay()->startOfDay();
        } elseif ($type === 'day') {
            $startDateTime = Carbon::parse($today->toDateString() . ' ' . $startTime);
            $endDateTime = Carbon::parse($today->toDateString() . ' ' . $endTime);

            if ($endDateTime->lt($startDateTime)) {
                $type = 'night_start';
                $endDateTime->addDay();
            }
        } else {
            $startDateTime = null;
            $endDateTime = null;
        }

        return [
            'type' => $type,
            'start' => $startDateTime,
            'end' => $endDateTime,
            'lookup_start' => $startDateTime?->copy()->subHours(12) ?? $today->copy()->startOfDay(),
            'lookup_end' => $endDateTime?->copy()->addHours(12) ?? $today->copy()->endOfDay(),
        ];
    }

    private function resolveWindowEvents(Collection $events, Carbon $from, Carbon $to): array
    {
        $windowEvents = $events->filter(function ($event) use ($from, $to) {
            return $event->event_at->betweenIncluded($from, $to);
        })->values();

        $firstEntry = $windowEvents->firstWhere('direction', true);
        $lastExit = $windowEvents->where('direction', false)->last();

        return [$firstEntry, $lastExit];
    }

    private function resolveDailyEvents(Collection $events, Carbon $from, Carbon $to): array
    {
        return $this->resolveWindowEvents($events, $from, $to);
    }

    private function calculateMonthStats($workerPosition, Carbon $now): array
    {
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->year === now()->year && $now->month === now()->month
            ? now()
            : $now->copy()->endOfMonth();

        $schedules = TurnstileWorkerSchedule::query()
            ->where('worker_position_id', $workerPosition?->id)
            ->whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->get();

        $events = TerminalEvent::query()
            ->where('worker_id', $workerPosition?->worker_id)
            ->whereBetween('event_date_and_time', [$startOfMonth->toDateTimeString(), $endOfMonth->toDateTimeString()])
            ->orderBy('event_date_and_time')
            ->get()
            ->map(function ($event) {
                $event->event_at = Carbon::parse($event->event_date_and_time);
                return $event;
            });

        $absentCount = 0;
        $earlyCount = 0;
        $leaveEarlyCount = 0;
        $entryCount = 0;


        foreach ($schedules as $schedule) {
            if (!$schedule->work_status) {
                continue;
            }

            $scheduleWindow = $this->resolveScheduleWindow($schedules, $schedule);
            if (!$scheduleWindow['start'] || !$scheduleWindow['end'] || $scheduleWindow['type'] === 'broken') {
                continue;
            }

            [$firstEntry, $lastExit] = $this->resolveWindowEvents(
                $events,
                $scheduleWindow['lookup_start'],
                $scheduleWindow['lookup_end']
            );

            if (!$firstEntry && !$lastExit) {
                $absentCount++;
                continue;
            }

            $entryCount++;

            if ($firstEntry && !Carbon::parse($firstEntry->event_date_and_time)->lt($scheduleWindow['start'])) {
                $earlyCount++;
            }

            if ($lastExit && Carbon::parse($lastExit->event_date_and_time)->lt($scheduleWindow['end'])) {
                $leaveEarlyCount++;
            }
        }

        return [
            'absent_count' => $absentCount,
            'early_count' => $earlyCount,
            'leave_count' => $leaveEarlyCount,
            'entry_count' => $entryCount,
        ];
    }
}
