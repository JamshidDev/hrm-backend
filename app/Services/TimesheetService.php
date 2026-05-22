<?php

namespace App\Services;

use App\Exports\TimesheetExport;
use App\Jobs\DocxToPdfJob;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Modules\TimeSheet\Models\TimeSheet;

class TimesheetService
{
    public static function excelGenerate($timesheet, $fileName)
    {
        $timesheet?->load([
            'workers.worker_position.contract',
            'workers.worker_position.worker',
            'workers.worker_position.position',
            'department',
            'work_place',
            'user'
        ]);

        $year = $timesheet->year;
        $month = $timesheet->month < 10 ? '0' . $timesheet->month : $timesheet->month;
        $startDate = "{$year}-{$month}-01";
        $endDate = Carbon::parse($startDate)->endOfMonth()->toDateString();

        if ($timesheet->department) {
            $department = $timesheet->department->name;
        } else {
            $department = $timesheet->work_place->name;
        }

        $timesheetCol = $timesheet->workers
            ->whereBetween('work_date', [$startDate, $endDate])
            ->groupBy('worker_position_id')
            ->values()
            ->map(function ($records, $index) {
                $allMonth = ['day' => 0, 'hours' => 0];
                $halfMonth = ['day' => 0, 'hours' => 0];

                $days = $records
                    ->groupBy('work_date')
                    ->map(function ($record, $date) use (&$allMonth, &$halfMonth) {
                        $day = Carbon::parse($date)->day;
                        $statuses = $record->map(fn($item) => [
                            'status' => $item->status,
                            'hours'  => $item->hours,
                        ]);

                        $totalHours = $statuses->sum('hours');

                        if ($totalHours > 0) {
                            $allMonth['day']++;
                            $allMonth['hours'] += $totalHours;
                            if ($day <= 15) {
                                $halfMonth['day']++;
                                $halfMonth['hours'] += $totalHours;
                            }
                        }

                        return [
                            'day'      => $day,
                            'statuses' => $statuses->values(),
                        ];
                    })
                    ->values();

                $sample = $records->first();

                return [
                    'index'     => $index + 1,
                    'worker'    => $sample->worker_position->worker->short_name(),
                    'position'  => $sample->worker_position->position->name,
                    'table'     => $sample->worker_position->contract->table,
                    'allMonth'  => $allMonth,
                    'halfMonth' => $halfMonth,
                    'days'      => $days,
                ];
            });

//        dd($timesheetCol);

        Excel::store(new TimesheetExport($timesheetCol, $year, $month, $department), $fileName, 'minio');
        DocxToPdfJob::dispatch($timesheet->file, 'documents/timesheets', $timesheet->id, TimeSheet::class);
        return $timesheet;
    }


}
