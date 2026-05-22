<?php

namespace App\Jobs\TurnstileJobs;

use App\Helpers\Helper;
use App\Services\TerminalService;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\Terminal;
use Modules\Turnstile\Models\TerminalLog;

class ManagementTerminalLogJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;
    protected $startDate;
    protected $endDate;
    protected $now;

    public function __construct($startDate, $endDate, $now)
    {
        $this->startDate = Carbon::parse($startDate);
        $this->endDate = Carbon::parse($endDate);
        $this->now = $now;
    }

    public function handle(): void
    {
        try {
            $externals = Worker::query()->select('id', 'external')
                ->with('position')
                ->get()
                ->keyBy('external');

            $workersByPin = Worker::query()->select('id', 'pin')
                ->with('position')
                ->get()
                ->keyBy('pin');

            $startDate = $this->startDate;
            $endDate = $this->endDate;
            $terminals = Terminal::query()->where('id', '!=', 9)->get();
            for ($day = $startDate; $day <= $endDate; $day->addDay()) {
                $events = [];
                $daySt = $day->copy()->toDateString();
                $startDateTime1 = $daySt . ' 00:00:00';
                $endDateTime1 = $daySt . ' 12:59:59';
                $startDateTime2 = $daySt . ' 13:00:00';
                $endDateTime2 = $daySt . ' 23:59:59';

                foreach ($terminals as $item) {
                    $data = TerminalService::getEvents(
                        $item->url,
                        $item->ip_address,
                        $startDateTime1,
                        $endDateTime1,
                    );

                    if (!$data['status']) {
                        continue;
                    }

                    if (!$data['request']['event_log_list']) {
                        continue;
                    }
                    foreach ($data['request']['event_log_list'] as $datum) {
                        $cardCount = strlen($datum['card']);
                        if ($cardCount === 14) {
                            $worker = $workersByPin[$datum['card']];
                        } else {
                            $worker = $externals[$datum['card']] ?? null;
                        }
                        if (!$worker) {
                            continue;
                        }
                        $workerId = $worker->id;
                        $positionId = $worker->position?->id;
                        $events[] = [
                            'worker_id' => $workerId,
                            'terminal_id' => $item->id,
                            'worker_position_id' => $positionId,
                            'event_time' => $datum['time'],
                            'event_type' => $item->type,
                            'expired' => $datum['expired'],
                            'created_at' => $this->now,
                            'updated_at' => $this->now,
                        ];
                    }
                }

                foreach ($terminals as $item) {
                    $data = TerminalService::getEvents(
                        $item->url,
                        $item->ip_address,
                        $startDateTime2,
                        $endDateTime2,
                    );

                    if (!$data['status']) {
                        continue;
                    }

                    if (!$data['request']['event_log_list']) {
                        continue;
                    }
                    foreach ($data['request']['event_log_list'] as $datum) {
                        $cardCount = strlen($datum['card']);
                        if ($cardCount === 14) {
                            $worker = $workersByPin[$datum['card']];
                        } else {
                            $worker = $externals[$datum['card']] ?? null;
                        }
                        if (!$worker) {
                            continue;
                        }
                        $workerId = $worker->id;
                        $positionId = $worker->position?->id;
                        $events[] = [
                            'worker_id' => $workerId,
                            'terminal_id' => $item->id,
                            'worker_position_id' => $positionId,
                            'event_time' => $datum['time'],
                            'event_type' => $item->type,
                            'expired' => $datum['expired'],
                            'created_at' => $this->now,
                            'updated_at' => $this->now,
                        ];
                    }
                }

                if (!empty($events)) {
                    foreach (array_chunk($events, 200) as $chunk) {
                        TerminalLog::insert($chunk);
                    }
                }
            }
        } catch (Exception $e) {
            Helper::setLog($e, 'Terminal log job failed:');
        }
    }

}
