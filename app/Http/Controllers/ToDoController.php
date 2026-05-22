<?php

namespace App\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Exports\DynamicExportFromArray;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Jobs\TurnstileJobs\TurnstileAbsentWorkersInRangeExcelJob;
use App\Models\UserExportTask;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;

class ToDoController extends Controller
{
    use Base64FileUploadTrait;

    public function test(Request $request)
    {
        $query = $request->all();
        $user = auth()->user();
        $from = Carbon::parse(request('from', now()->toDateString()));
        $end = Carbon::parse(request('to', now()->toDateString()));

        $start = $from->copy()->startOfDay()->toDateTimeString();
        $to = $end->copy()->addDay()->startOfDay()->toDateTimeString();
        $dateString = $end->copy()->format('Y-m-d');

        $workers = Worker::query()
            ->filter($user, $query)
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
                    $query->whereBetween('date', [$start, $to]);
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

                $schedules = $worker->schedules->groupBy('date');
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

        return $data;

    }

    public function terminalEvents()
    {
        $firstEntries = DB::table('terminal_events')
            ->select(
                'worker_id',
                DB::raw('DATE(event_date_and_time) as work_day'),
                DB::raw('MIN(event_date_and_time) as first_entry')
            )
            ->where('direction', true)
            ->groupBy('worker_id', DB::raw('DATE(event_date_and_time)'));

        $late = DB::query()
            ->fromSub($firstEntries, 'fe')
            ->whereRaw("fe.first_entry::time > TIME '09:05:00'")
            ->whereRaw("fe.first_entry::time < TIME '13:05:00'")
            ->whereRaw("EXTRACT(DOW FROM fe.work_day) NOT IN (0, 6)")
            ->whereRaw("date_trunc('month', fe.work_day) = date_trunc('month', CURRENT_DATE)")
            ->groupBy('fe.worker_id')
            ->select([
                'fe.worker_id',
                DB::raw('COUNT(*) as late_count'),
                DB::raw("
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'date', fe.work_day,
                    'time', fe.first_entry::time
                )
                ORDER BY fe.work_day
            ) as late_logs
        ")
            ]);

        $logs = DB::query()
            ->fromSub($late, 'l')
            ->join('workers as w', 'w.id', '=', 'l.worker_id')
            ->leftJoin('worker_positions as wp', 'wp.worker_id', '=', 'w.id')
            ->leftJoin('departments as d', 'd.id', '=', 'wp.department_id')
            ->leftJoin('organizations as o', 'o.id', '=', 'wp.organization_id')
            ->leftJoin('positions as p', 'p.id', '=', 'wp.position_id')
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->whereIn('wp.organization_id', [2, 3, 4, 5, 6, 221, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                17, 18, 215, 223, 1, 19, 20, 22, 23, 24, 25, 27, 28, 49, 50, 51, 52, 53, 55, 56, 57, 66, 72, 73])
            ->select([
                DB::raw("CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) as full_name"),
                'd.name as department_name',
                'o.name as organization_name',
                'p.name as position_name',

                'l.late_count',
                'l.late_logs'
            ])
            ->orderByDesc('l.late_count')
            ->get()->map(function ($item) {
                $logs = collect(json_decode($item->late_logs))
                    ->map(function ($log) {
                        return $log->date . ' ' . $log->time;
                    })
                    ->implode("\n");

                return [
                    'full_name' => $item->full_name,
                    'organization_name' => $item->organization_name,
                    'department_name' => $item->department_name,
                    'position_name' => $item->position_name,
                    'late_count' => $item->late_count,
                    'late_logs' => $logs
                ];
            })->values()->toArray();

        return Excel::download(new DynamicExportFromArray($logs, 'worker'), 'worker_logs.xlsx');
    }
}
