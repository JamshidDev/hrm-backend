<?php

namespace Modules\TimeSheet\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\HR\Models\Department;
use Modules\HR\Models\WorkerPosition;
use Modules\TimeSheet\Models\TimeSheetWorkerDepartment;
use Modules\TimeSheet\Transformers\WorkerPositionTimesheetResource;
use Spatie\Permission\Models\Role;

class TimeSheetWorkerDepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $per_page = request('per_page', 10);

        $data = WorkerPosition::query()
            ->filter($user, request()->all())
            ->search()
            ->whereHas('time_sheet_departments')
            ->with([
                'time_sheet_departments',
                'time_sheet_departments.department',
                'time_sheet_departments.work_place',
                'worker:id,first_name,last_name,middle_name,photo',
                'department:id,name,level',
                'organization:id,name,group,full_name',
                'position:id,name'
            ])
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->orderBy('id')
            ->paginate($per_page);

        $data = PaginateResource::make($data, WorkerPositionTimesheetResource::class);
        return Helper::response(true, $data);
    }

    public function attach(Request $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $request->validate([
                'departments' => 'required|array',
            ]);

            $workerPosition = WorkerPosition::query()->findOrFail($request->worker_position_id);
            if (!$workerPosition) {
                return Helper::response(trans('messages.worker_position_not_found'), [], 400);
            }

            $rUser = User::query()->where('worker_id', $workerPosition->worker_id)->first();

            if (!$rUser) {
                return Helper::response(trans('messages.user_not_found'), [], 400);
            }

            $departments = Department::whereIn('id', $request->departments)->get();

            $now = now()->toDateTimeString();
            $existDepIds = TimeSheetWorkerDepartment::query()
                ->where('worker_position_id', $workerPosition->id)
                ->pluck('department_id')
                ->toArray();

            $data = [];
            foreach ($departments as $department) {
                if (in_array($department->id, $existDepIds, true)) {
                    continue;
                }
                $data[] = [
                    'organization_id' => $department->organization_id,
                    'worker_position_id' => $workerPosition->id,
                    'worker_id' => $workerPosition->worker_id,
                    'department_id' => $department->id,
                    'work_place_id' => $department->organization_id,
                    'active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (count($data)){
                TimeSheetWorkerDepartment::insert($data);
            }

            $role = Role::findByName('TimesheetHR');
            $orgId = $departments->first()->organization_id;

            $hasRoles = $rUser->organizationRoles($orgId);
            foreach ($hasRoles as $item) {
                if ($role->id === $item->id) {
                    return Helper::response(trans("messages.successfully_attached"));
                }
                if ($item->name === 'Worker')
                {
                    $rUser->roles()->detach($item->id);
                }
            }
            $rUser->roles()->attach($role->id, [
                'organization_id' => $orgId,
                'model_type'      => User::class,
            ]);
            return Helper::response(trans("messages.successfully_attached"));
        });
    }

    public function detach(Request $request): JsonResponse
    {
        if ($request->worker_position_id)
        {
            TimeSheetWorkerDepartment::where('worker_position_id', $request->worker_position_id)->delete();
        }
        if ($request->department_id)
        {
            TimeSheetWorkerDepartment::where('id', $request->department_id)->forceDelete();
        }
        return Helper::response(trans("messages.successfully_detached"));
    }

}
