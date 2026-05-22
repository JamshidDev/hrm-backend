<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class WorkerScheduleWithTurnstileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'position' => PositionHelper::getShortPosition($this),
            'schedules' => $this->generateDays(),
            'schedule_type' => new ScheduleTypeMinResource($this->scheduleType),
            'is_turnstile' => $this->is_turnstile,
            'turnstile_privilege_start_minute' => $this->turnstile_privilege_start_minute,
            'turnstile_privilege_end_minute' => $this->turnstile_privilege_end_minute
        ];
    }

    private function generateDays(): array
    {
        $date = request()->has('date')
            ? Carbon::parse(request('date'))
            : Carbon::now();

        $events = collect($this->terminal_events)
            ->groupBy(function ($event) {
                return Carbon::parse($event->event_date_and_time)->format('Y-m-d');
            });

        $start = $date->copy()->startOfMonth();
        $end = $date->copy()->endOfMonth();
        $items = $this->scheduleDays->keyBy('date');
        $days = [];

        for ($day = $start->copy(); $day <= $end; $day->addDay()) {
            $dayKey = $day->format('Y-m-d');
            $existItem = $items[$dayKey] ?? null;

            // shu kungi eventlar
            $dayEvents = $events[$dayKey] ?? collect();

            // agar birinchi kirish va oxirgi chiqish kerak bo‘lsa:
            $firstIn = $dayEvents->where('direction', true)
                ->sortBy('event_date_and_time')
                ->first();

            $lastOut = $dayEvents->where('direction', false)
                ->sortByDesc('event_date_and_time')
                ->first();

            $days[] = [
                'id' => $existItem?->id,
                'date' => $day->format('Y-m-d'),
                'work_status' => $existItem ? $existItem->work_status : false,
                'start_time' => $existItem ? $existItem->start_time : null,
                'end_time' => $existItem ? $existItem->end_time : null,
                'daily_minutes' => $existItem ? $existItem->daily_minutes : 0,
                'daytime' => $existItem ? $existItem->daytime : 0,
                'evening_time' => $existItem ? $existItem->evening_time : 0,
                'fact_daily_minutes' => $existItem ? $existItem->fact_daily_minutes : 0,
                'fact_daytime' => $existItem ? $existItem->fact_daytime : 0,
                'fact_evening_time' => $existItem ? $existItem->fact_evening_time : 0,
                'cause' => $existItem ? $existItem->cause : null,

                // qo‘shimcha eventlar
                'first_in' => $firstIn?->event_date_and_time,
                'last_out' => $lastOut?->event_date_and_time,
            ];
        }

        return $days;
    }
}
