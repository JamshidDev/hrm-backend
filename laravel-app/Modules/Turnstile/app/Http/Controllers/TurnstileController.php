<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\HCPErrorLogJob;
use App\Jobs\TurnstileJobs\TurnstileAbsentWorkersInRangeExcelJob;
use App\Models\UserExportTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Modules\HR\Models\Department;
use Modules\HR\Transformers\Department\DepartmentOrganizationResource;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;
use Modules\Turnstile\Enums\ScheduleTypeEnum;
use Modules\Turnstile\Models\HcpAddedWorkerLog;
use Modules\Turnstile\Models\HCPErrorLog;
use Modules\Turnstile\Models\WorkerHikCentral;
use Modules\Turnstile\Transformers\AddedWorkerLogResource;
use Modules\Turnstile\Transformers\InvalidWorkersResource;

class TurnstileController extends Controller
{
    public function enums(): JsonResponse
    {
        $times = [
            [
                'start_time' => '00:00',
                'end_time' => '08:00',
                'daily_minutes' => 480,
                'daytime' => 120,
                'evening_time' => 360
            ],
            [
                'start_time' => '08:00',
                'end_time' => '20:00',
                'daily_minutes' => 720,
                'daytime' => 720,
                'evening_time' => 0
            ],
            [
                'start_time' => '20:00',
                'end_time' => '00:00',
                'daily_minutes' => 240,
                'daytime' => 120,
                'evening_time' => 120
            ],
            [
                'start_time' => '00:00',
                'end_time' => '08:00',
                'daily_minutes' => 420,
                'daytime' => 120,
                'evening_time' => 300
            ],
            [
                'start_time' => '08:00',
                'end_time' => '20:00',
                'daily_minutes' => 660,
                'daytime' => 660,
                'evening_time' => 0
            ]
        ];

        return Helper::response(true, [
            'schedule_types' => ScheduleTypeEnum::list(),
            'times' => $times
        ]);
    }


    public function absentScheduledWorkers(Request $request)
    {
        $request->validate([
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
        ]);
        $filters = $request->all();
        $userId = auth()->user()->id;

        $task = UserExportTask::create([
            'user_id' => $userId,
            'type' => ExportTaskEnum::TURNSTILE_ABSENT_WORKERS->value,
        ]);

        TurnstileAbsentWorkersInRangeExcelJob::dispatch($filters, $task, $userId);
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function addedLogs(): JsonResponse
    {
        $user = auth()->user();
        $logs = HcpAddedWorkerLog::query()
            ->filter($user, request()->all())
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->with([
                'user.worker:id,last_name,first_name,middle_name,photo',
                'worker',
                'worker_photo',
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($logs, AddedWorkerLogResource::class);

        return Helper::response(true, $data);
    }

    public function invalidWorkersByHcp(): JsonResponse
    {
        $invalidCache = Cache::get('hcp_invalid_workers');
        if (!$invalidCache) {
            return Helper::response(true, [
                'time' => now()->toDateTimeString(),
                'data' => [],
            ]);
        }
        $errors = collect($invalidCache['errors']);
        $time = $invalidCache['time'];

        $user = auth()->user();

        $data = WorkerHikCentral::query()
            ->whereHas('worker.positions', function ($query) use ($user) {
                $query->select('id', 'worker_id', 'organization_id', 'department_id', 'position_id')
            ->filter($user, request()->all());
            })
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->whereIn('worker_id', $errors->pluck('worker_id')->toArray())
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'photo'
            ])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, InvalidWorkersResource::class);

        return Helper::response(true, [
            'time' => $time,
            'data' => $data,
        ]);
    }

    public function setLog(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:20000|mimes:zip']);
        $file = $request->file('file');
        $time = time();
        if (HCPErrorLog::query()->where('time', $time)->exists()) {
            return Helper::response(trans('messages.already_this_file'), [], 400);
        }
        $name = time() . '.' . $file->getClientOriginalExtension();
        $newFile = Storage::put('turnstile/hcp/error-logs/' . $name, file_get_contents($file));
        if ($newFile) {
            HCPErrorLog::query()->create([
                'path' => 'turnstile/hcp/error-logs/' . $name,
                'time' => $time
            ]);
            HCPErrorLogJob::dispatch();
        } else {
            return Helper::response(trans('messages.error_store_file'), [], 400);
        }
        return Helper::response();
    }

    public function userTimesheetDepartments(): JsonResponse
    {
        $user = auth()->user();
        $departmentIds = null;

        if ($user->hasRole('TimesheetHR')){
            $departmentIds = TimeSheetWorkerDepartment::query()
                ->where('worker_id', $user->worker_id)
                ->select('department_id');
        }

        $departments = Department::query()
            ->filterByOrganization($user)
            ->when($departmentIds, function ($q) use ($departmentIds) {
                $q->whereIn('id', $departmentIds);
            })
            ->with(['organization:id,name,group'])
            ->orderBy('organization_id')
            ->paginate(request('per_page', 50));


        $data = PaginateResource::make($departments, DepartmentOrganizationResource::class);
        return Helper::response(true, $data);
    }

}
