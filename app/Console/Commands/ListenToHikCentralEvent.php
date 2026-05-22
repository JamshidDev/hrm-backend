<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\HikCentralAccessLevelDevice;
use Modules\Turnstile\Models\HikCentralDevice;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\WorkDuration;
use PDO;

class ListenToHikCentralEvent extends Command
{
    protected $signature = 'hik:listen';

    public function handle(): void
    {
        $pdo = DB::connection('hcp_db')->getPdo();
        $pdo->exec('LISTEN new_event_channel');

        while (true) {
            $event = $pdo->pgsqlGetNotify(PDO::FETCH_ASSOC, 1000000);
            if ($event) {
                $payload = json_decode($event['payload'], true, 512, JSON_THROW_ON_ERROR);

                $cardNo = $payload['employee_id'] ?? null;
                if (!$cardNo) {
                    continue;
                }

                $worker = Worker::find($cardNo);
                if (!$worker) {
                    continue;
                }

                $device = HikCentralDevice::query()->where('name', $payload['recource_name'])->first();
                $accessLevelId = HikCentralAccessLevelDevice::query()
                    ->where('hik_central_device_id', $device?->id)->first()
                    ?->hik_central_access_level_id;

                $workerPositionId = $worker->load('position')->position?->id;

                TerminalEvent::create([
                    'worker_id' => $worker->id,
                    'hik_central_access_level_id' => $accessLevelId,
                    'worker_position_id' => $workerPositionId,
                    'event_date' => $payload['access_date'],
                    'event_time' => $payload['access_time'],
                    'event_date_and_time' => Carbon::parse($payload['access_date'] . ' ' . $payload['access_time']),
                    'auth_type' => $payload['auth_type'],
                    'device_name' => $payload['device_name'],
                    'device_serial' => $payload['device_serial'],
                    'resource_name' => $payload['recource_name'],
                    'last_name' => $worker->last_name,
                    'first_name' => $worker->first_name,
                    'middle_name' => $worker->middle_name,
                    'direction' => (int)$payload['direction'] === 1,
                    'temperature' => $payload['temp_status'],
                    'mask_status' => $payload['mask_status'],
                ]);
            }

            usleep(500000); // 0.5s delay
        }
    }

    public function calculateWorkerWorkDuration($worker, $event): void
    {
        $now = Carbon::now();
        $lastWorkDuration = WorkDuration::query()
            ->where('access_level_id', $event->hik_central_access_level_id)
            ->where('worker_id', $worker->id)
            ->latest()
            ->first();

        if ($lastWorkDuration) {
            $lastEventDay = Carbon::parse($lastWorkDuration->event_time);
        }

        if ($lastWorkDuration &&
            $lastEventDay->year === $now->year &&
            $lastEventDay->month === $now->month &&
            $lastEventDay->day === $now->day) {

            if ($lastWorkDuration->event_type) {
                if ($event->duration) {
                    $lastWorkDuration->update([
                        'event_time' => $now,
                        'event_type' => true,
                    ]);
                } else {
                    $diffMinutes = (int)abs($now->diffInMinutes($lastEventDay));
                    $lastWorkDuration->update([
                        'event_time' => $now,
                        'event_type' => false,
                        'total_minutes' => $lastWorkDuration->total_minutes + $diffMinutes,
                    ]);
                }
            } else {
                $totalMinutes = 0;
                if (!$event->duration) {
                    $totalMinutes = (int)abs($now->diffInMinutes($lastWorkDuration->event_time));
                }
                $lastWorkDuration->update([
                    'event_time' => $now,
                    'event_type' => $event->direction,
                    'total_minutes' => $lastWorkDuration->total_minutes + $totalMinutes
                ]);
            }
        } else {
            if ($lastWorkDuration && $lastWorkDuration->event_type) {
                $lastTime = Carbon::parse($lastWorkDuration->event_time);
                $tMin = $lastWorkDuration->total_minutes + (int)abs($lastTime->diffInMinutes($lastTime->endOfDay()));
                $lastWorkDuration->update(['total_minutes' => $tMin]);
            }

            $totalMinutes = 0;
            if (!$event->direction) {
                $startTimeInDay = (clone $now)->startOfDay();
                $totalMinutes = (int)abs($now->diffInMinutes($startTimeInDay));
            }

            WorkDuration::create([
                'worker_id'          => $worker->id,
                'worker_position_id' => $worker->load('position')->position?->id,
                'access_level_id' => $event->hik_central_access_level_id,
                'building_id' => 1,
                'year' => $now->year,
                'month' => $now->month,
                'day' => $now->day,
                'event_time' => $now,
                'event_type' => $event->direction,
                'total_minutes' => $totalMinutes
            ]);
        }
    }

}
