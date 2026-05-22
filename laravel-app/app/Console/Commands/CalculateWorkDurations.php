<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\WorkDuration;

class CalculateWorkDurations extends Command
{
    protected $signature = 'app:calculate-work-durations';
    protected $description = 'Xodimlarni ishlagan soatlarini xisoblab chiqish';

    public function handle(): void
    {
        $yesterday = Carbon::yesterday();
        $date = $yesterday->toDateString();

        $events = TerminalEvent::whereDate('event_date_and_time', $date)
            ->orderBy('worker_id')
            ->orderBy('event_date_and_time')
            ->get()
            ->groupBy('worker_id');

        foreach ($events as $workerId => $logs) {
            $totalMinutes = 0;

            $logs = $logs->values();
            for ($i = 0; $i < $logs->count(); $i += 2) {
                if (isset($logs[$i + 1])) {
                    $in  = Carbon::parse($logs[$i]->event_date_and_time);
                    $out = Carbon::parse($logs[$i + 1]->event_date_and_time);
                    $totalMinutes += $in->diffInMinutes($out);
                }
            }

            WorkDuration::updateOrCreate(
                [
                    'worker_id' => $workerId,
                    'year' => $yesterday->year,
                    'month' => $yesterday->month,
                    'day' => $yesterday->day,
                ],
                [
                    'total_minutes' => $totalMinutes,
                    'event_time' => $yesterday,
                ]
            );
        }

        $this->info("Work durations calculated for {$date}");
    }
}
