<?php

namespace App\Jobs\TurnstileJobs;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Exports\AttendanceExport;

class TurnstileEventsExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected UserExportTask $task;

    protected int $userId;
    protected array $query;

    public function __construct($task, $query, $userId)
    {
        $this->task = $task;
        $this->userId = $userId;
        $this->query = $query;
    }

    public function handle(): void
    {
        try {
            $user = User::findOrFail($this->userId);
            $from = Carbon::parse($this->query['from'] ?? now()->toDateString());
            $end = Carbon::parse($this->query['to'] ?? now()->toDateString());

            $start = $from->copy()->startOfDay()->toDateTimeString();
            $to = $end->copy()->addDay()->startOfDay()->toDateTimeString();
            $dateString = $end->copy()->format('Y-m-d');

            $workers = Worker::query()
                ->filter($user, $this->query)
                ->leftJoin('vacations as v', function ($join) use ($dateString) {
                    $join->on('workers.id', '=', 'v.worker_id')
                        ->whereDate('v.to', '>=', $dateString)
                        ->whereDate('v.from', '<=', $dateString);
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
                ->with([
                    'terminal_events' => function ($query) use ($start, $to) {
                        $query->select(
                            'worker_id',
                            'event_date_and_time',
                            'direction',
                            DB::raw("DATE(event_date_and_time) as date"))
                            ->whereBetween('event_date_and_time', [$start, $to])
                            ->orderBy('event_date_and_time');
                    },
                    'schedules' => function ($query) use ($start, $to) {
                        $query->whereBetween('date', [$start, $to])->orderByDesc('date');
                    },
                    'position',
                    'position.organization',
                    'position.department',
                    'position.position'
                ])
                ->get();

            $data = [];
            foreach ($workers as $worker) {
                $wData = [
                    'full_name' => $worker->full_name(),
                    'organization' => $worker->position->organization->name,
                    'position' => PositionHelper::getShortPosition($worker->position),
                ];

                $events = $worker->terminal_events->groupBy('date');
                for ($i = $from->copy(); $i->lte($end); $i->addDay()) {
                    $date = $i->format('Y-m-d');

                    $eventsStart = $events->get($date);
                    $wData[$date]['turnstile_start'] = $eventsStart ?
                        $eventsStart->where('direction', true)
                            ->sortBy('event_date_and_time')
                            ->first()?->event_date_and_time : null;

                    $eventsEnd = $events->get($date);
                    $wData[$date]['turnstile_end'] = $eventsEnd ?
                        $eventsEnd->where('direction', false)
                            ->sortByDesc('event_date_and_time')
                            ->first()?->event_date_and_time : null;

                    $schedules = $worker
                        ->schedules
                        ->where('worker_position_id', $worker->position->id)
                        ->groupBy('date');

                    $schedule = $schedules->get($date)?->first();
                    $wData[$date]['schedule_start'] = $schedule?->start_time;
                    $wData[$date]['schedule_end'] = $schedule?->end_time;
                    $wData[$date]['schedule_work_status'] = $schedule?->work_status;

                    if ($schedule) {
                        $scheduleStart = $schedule->date . ' ' . $schedule->start_time;
                        $scheduleEnd = $schedule->date . ' ' . $schedule->end_time;
                    } else {
                        $scheduleStart = null;
                        $scheduleEnd = null;
                    }

                    $turnstileStart = $wData[$date]['turnstile_start'];
                    $turnstileEnd = $wData[$date]['turnstile_end'];

                    $wData[$date]['late'] = ($scheduleStart && $turnstileStart && Carbon::parse($turnstileStart)->gt(Carbon::parse($scheduleStart)));
                    $wData[$date]['early'] = ($scheduleEnd && $turnstileEnd && Carbon::parse($turnstileEnd)->lt(Carbon::parse($scheduleEnd)));

                }
                $data[] = $wData;
            }

            $fileName = 'tasks/export/turnstile/' . md5($this->task->id) . '.xlsx';
            Excel::store(new AttendanceExport($data), $fileName, 'minio');
            $this->task->update(['file' => $fileName, 'status' => ExportJobStatusEnum::DONE->value,]);
        } catch (Exception $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Turnstile export failed:");
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $logId]);
        }
    }
}
