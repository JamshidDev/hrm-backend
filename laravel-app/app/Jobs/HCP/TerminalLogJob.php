<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use Carbon\Carbon;
use DateTime;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\Terminal;
use Modules\Turnstile\Models\TerminalLog;
use Modules\Turnstile\Models\WorkDuration;

class TerminalLogJob implements ShouldQueue
{
    use Queueable;

    protected array $request;
    protected DateTime $now;

    public function __construct($request, $now)
    {
        $this->request = $request;
        $this->now = Carbon::parse($now);
    }

    public function handle(): void
    {
        DB::beginTransaction();
        try {
            $log = $this->request;

            if (!in_array((int)$log['card'], $this->whiteList(), true)) {
                $terminal = Terminal::query()->where('ip_address', $log['ip'])->first();

                if ((int)$log['card'] > 100000000) {
                    $worker = Worker::query()->find((int)$log['employee_no']);
                } else {
                    $worker = Worker::query()->where('external', $log['card'])->first();
                }

                $type = (int)$log['type'] === 1;
                $now = $this->now;

                if ($worker && $terminal) {
                    $workerPosition = $worker->load('position')->position;
                    $this->createLog(
                        $worker->id,
                        $workerPosition?->id,
                        $terminal->id,
                        $this->now,
                        $type,
                        $log['expired']
                    );

                    $lastWorkDuration = WorkDuration::query()
                        ->where('worker_id', $worker->id)
                        ->whereBuildingId($terminal->building_id)
                        ->latest()
                        ->first();

                    if ($lastWorkDuration &&
                        $lastWorkDuration->year === (int)$now->year &&
                            $lastWorkDuration->month === (int)$now->month &&
                            $lastWorkDuration->day === (int)$now->day) {

                            if ($lastWorkDuration->event_type) {
                                if ($type) {
                                    $lastWorkDuration->update([
                                        'event_time' => $this->now,
                                        'event_type' => true,
                                        'expired' => $log['expired'],
                                    ]);
                                } else {

                                    $lastEvent = Carbon::parse($lastWorkDuration?->event_time);
                                    $diffMinutes = (int)abs($this->now->diffInMinutes($lastEvent));
                                    $lastWorkDuration->update([
                                        'event_time' => $this->now,
                                        'event_type' => false,
                                        'expired' => $log['expired'],
                                        'total_minutes' => $lastWorkDuration->total_minutes + $diffMinutes,
                                    ]);
                                }
                            } else {
                                $totalMinutes = 0;
                                if (!$type) {
                                    $totalMinutes = (int)abs($this->now->diffInMinutes($lastWorkDuration->event_time));
                                }
                                $lastWorkDuration->update([
                                    'event_time' => $this->now,
                                    'event_type' => $type,
                                    'total_minutes' => $lastWorkDuration->total_minutes + $totalMinutes,
                                    'expired' => $log['expired'],
                                ]);
                            }
                    } else {
                        if ($lastWorkDuration && $lastWorkDuration->event_type) {
                            $eventDate = Carbon::parse($lastWorkDuration->event_time);
                            $tMin = $lastWorkDuration->total_minutes + (int)abs($eventDate->diffInMinutes($eventDate->endOfDay()));
                            $lastWorkDuration->update(['total_minutes' => $tMin]);
                        }

                        $totalMinutes = 0;
                        if (!$type) {
                            $startTimeInDay = (clone $now)->startOfDay();
                            $totalMinutes = (int)abs($now->diffInMinutes($startTimeInDay));
                        }

                        WorkDuration::create([
                            'worker_id'          => $worker->id,
                            'worker_position_id' => $workerPosition?->id,
                            'building_id' => $terminal->building_id,
                            'year'        => $this->now->year,
                            'month'       => $this->now->month,
                            'day'         => $this->now->day,
                            'event_time'  => $this->now,
                            'event_type'  => $type,
                            'total_minutes' => $totalMinutes
                        ]);
                    }

                }
            }

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e, 'Terminal log job failed:');
        }
    }

    public function whiteList(): array
    {
        return [96658];
    }

    public function createLog($workerId, $workerPositionId, $terminalId, $now, $type, $expired): void
    {
        TerminalLog::create([
            'worker_id' => $workerId,
            'worker_position_id' => $workerPositionId,
            'terminal_id' => $terminalId,
            'event_time' => $now,
            'event_type' => $type,
            'expired' => $expired,
        ]);
    }

}
