<?php

namespace Modules\TimeSheet\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginationResource;
use App\Services\WorkerPositionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;
use Modules\Structure\Models\Holiday;
use Modules\TimeSheet\Enums\TimeSheetTypeEnum;
use Modules\TimeSheet\Models\TimeSheet;
use Modules\TimeSheet\Models\TimeSheetWorker;

class TimeSheetWorkerController extends Controller
{

    public function index($timesheetId, Request $request): JsonResponse
    {
        $per_page = $request->per_page ?? 50;

        $timesheet = TimeSheet::find($timesheetId);
        $year = $timesheet->year;
        $month = $timesheet->month;

        $usedWorkerPositionIds = TimeSheetWorker::where('time_sheet_id', $timesheetId)
            ->whereYear('work_date', $year)
            ->whereMonth('work_date', $month)
            ->pluck('worker_position_id')
            ->unique();

        $workers = WorkerPosition::query()
            ->when($timesheet->department_id, function ($query, $departmentId) use ($usedWorkerPositionIds) {
                return $query->where('department_id', $departmentId)
                    ->orWhereIn('id', $usedWorkerPositionIds);
            })
            ->when($timesheet->work_place_id, function ($query, $work_place_id) use ($usedWorkerPositionIds) {
                return $query->where('organization_id', $work_place_id)
                    ->orWhereIn('id', $usedWorkerPositionIds);
            })
            ->where('status', PositionStatusEnum::ACTIVE)
            ->with('timesheet', function ($query) use ($year, $month, $timesheetId) {
                $query->where('time_sheet_id', $timesheetId)
                    ->whereYear('work_date', $year)
                    ->whereMonth('work_date', $month);
            })
            ->with([
                'worker:id,first_name,last_name,middle_name,photo',
                'position:id,name',
            ])
            ->paginate($per_page);

        $workers->getCollection()->transform(function ($worker) {
            $days = $worker->timesheet
                ->groupBy('work_date')
                ->map(function ($items, $date) {
                    $day = Carbon::parse($date)->day;

                    $details = $items->map(function ($item) {
                        return [
                            'hours'  => $item->hours ?? 0,
                            'status' => TimeSheetTypeEnum::get($item->status)['key'] ?? null,
                        ];
                    });

                    return [
                        'day'     => $day,
                        'details' => $details->values(),
                    ];
                })
                ->values();

            return [
                'id'       => $worker->id,
                'name'     => $worker->worker->short_name(),
                'table'    => null,
                'photo'    => Helper::fileUrl($worker->worker?->photo),
                'position' => $worker->position->name,
                'days'     => $days,
            ];
        });

        $workers = PaginationResource::make($workers);
        return Helper::response(true, $workers);
    }

    public function store($timesheetId, Request $request): JsonResponse
    {
        $timesheet = TimeSheet::find($timesheetId);

        if ($timesheet->status) {
            return Helper::response(trans('messages.time_sheet_status_confirmed'), [], 403);
        }

        $data = collect($request->workers)
            ->map(function ($worker) use ($timesheetId, $request) {
                return [
                    'time_sheet_id'      => (int)$timesheetId,
                    'worker_position_id' => (int)$worker['id'],
                    'work_date'          => Carbon::parse($worker['day'])->format('Y-m-d'),
                    'hours'              => $request->hours,
                    'status'             => $request->status,
                ];
            })->toArray();

        if ($request->status) {
            if (!empty($data)) {
                TimeSheetWorker::upsert(
                    $data,
                    ['time_sheet_id', 'worker_position_id', 'status', 'work_date'],
                    ['hours']
                );
            }
        } else {
            $workerIds = array_column($data, 'worker_position_id');
            $dates = array_column($data, 'work_date');

            TimeSheetWorker::where('time_sheet_id', $timesheetId)
                ->whereIn('work_date', $dates)
                ->whereIn('worker_position_id', $workerIds)
                ->forceDelete();
        }


        return Helper::response(trans('messages.create_success'));
    }

    public function dayInMonth($timesheetId): JsonResponse
    {
        $timesheet = TimeSheet::find($timesheetId);
        $year = $timesheet->year;
        $month = $timesheet->month;

        $holidays = Holiday::whereYear('holiday_date', $year)
            ->whereMonth('holiday_date', $month)
            ->get();

        $daysInMonth = Carbon::parse("$year-$month-01")->daysInMonth;

        $days = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = Carbon::parse("$year-$month-$day");

            $holiday = $holidays->where('date', $date)->first();

            $days[] = [
                'day'        => $day,
                'weekDay'    => $date->dayOfWeek,
                'is_holiday' => (bool)$holiday,
                'comment'    => $holiday?->name,
            ];
        }

        $department = $timesheet->department->name ?? $timesheet->work_place->name;

        return Helper::response(true, [
            'department' => $department,
            'month'      => $timesheet->month,
            'year'       => $timesheet->year,
            'days'       => $days,
        ]);
    }


    public function checkWorker(Request $request): JsonResponse
    {
        $data = WorkerPositionMinimalResource::collection(new WorkerPositionService()->checkWorker($request->pin));
        return Helper::response(true, $data);
    }
}
