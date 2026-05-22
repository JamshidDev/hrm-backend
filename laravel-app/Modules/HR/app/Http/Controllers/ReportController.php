<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Report\DepartmentPositionResource;
use Modules\HR\Transformers\Report\DepartmentResource;
use Modules\HR\Transformers\Report\StructureResource;
use Modules\HR\Transformers\Report\WorkerPositionResource;
use Modules\Structure\Models\Organization;

class ReportController extends Controller
{
    public function structure(): JsonResponse
    {
        $user = auth()->user()->load('roles.permissions', 'organization');
        if (!$user->organization_id) {
            return Helper::response(trans('messages.organization_not_found'), [], 400);
        }
        $orgIds = Organization::query()
            ->search()
            ->when(
                $user->hasPermissionTo('organization-admin'),
                fn ($q) => $q,
                fn ($q) => $user->hasPermissionTo('organization-leader')
                    ? $q->leaderOrganizations($user)
                    : $q->where('id', $user->organization_id)
            )
            ->select('id');

        $organizations = Organization::query()
            ->leftJoinSub(
                DB::table('worker_positions')
                    ->where('status', PositionStatusEnum::ACTIVE->value)
                    ->whereNull('deleted_at')
                    ->selectRaw('organization_id, SUM(rate) as worker_rate')
                    ->groupBy('organization_id'),
                'wp',
                'wp.organization_id',
                '=',
                'organizations.id'
            )
            ->leftJoinSub(
                DB::table('department_positions')
                    ->whereNull('deleted_at')
                    ->selectRaw('organization_id, SUM(rate) as department_rate')
                    ->groupBy('organization_id'),
                'dp',
                'dp.organization_id',
                '=',
                'organizations.id'
            )
            ->whereIn('organizations.id', $orgIds)
            ->select('organizations.*', 'wp.worker_rate', 'dp.department_rate')
            ->defaultOrder()
            ->get()
            ->toTree();

        return Helper::response(true, StructureResource::collection($organizations ?? []));
    }

    public function departments(): JsonResponse
    {
        $user = auth()->user();
        $departments = Department::query()
            ->search()
            ->where('departments.organization_id', request('organization_id'))
            ->leftJoinSub(
                DB::table('department_positions')
                    ->whereNull('deleted_at')
                    ->selectRaw('department_id, SUM(rate) as department_rate')
                    ->groupBy('department_id'),
                'dp',
                'dp.department_id',
                '=',
                'departments.id'
            )
            ->leftJoinSub(
                DB::table('worker_positions')
                    ->selectRaw('department_id, SUM(rate) as worker_rate')
                    ->where('status', PositionStatusEnum::ACTIVE->value)
                    ->whereNull('deleted_at')
                    ->groupBy('department_id'),
                'wp',
                'wp.department_id',
                '=',
                'departments.id'
            )
            ->select([
                'departments.*',
                DB::raw('COALESCE(dp.department_rate, 0) as department_rate'),
                DB::raw('COALESCE(wp.worker_rate, 0) as worker_rate'),
            ])
            ->defaultOrder()
            ->get()
            ->toTree();

        $data = DepartmentResource::collection($departments);

        return Helper::response(true, $data);
    }

    public function department_positions(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $departments = DepartmentPosition::query()
            ->search()
            ->where('organization_id', request('organization_id'))
            ->when(request('department_id'), function ($query, $department_id) {
                $query->where('department_id', $department_id);
            })
            ->withSum('worker_positions as worker_rate', 'rate')
            ->paginate($per_page);

        $data = PaginateResource::make($departments, DepartmentPositionResource::class);

        return Helper::response(true, $data);
    }

    public function worker_positions(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $workers = WorkerPosition::query()
            ->search()
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->filter(auth()->user(), request()->all())
            ->where('organization_id', request('organization_id'))
            ->when(request('department_id'), function ($query, $department_id) {
                $query->where('department_id', $department_id);
            })
            ->when(request('departments'), function ($query, $departments) {
                $query->whereIn('department_id', explode(',', $departments));
            })
            ->when(request('department_position_id'), function ($query, $department_position_id) {
                $query->where('department_position_id', $department_position_id);
            })
            ->with([
                'worker:id,first_name,last_name,middle_name,birthday,photo,uuid',
                'department:id,name,level',
                'organization:id,name,name_en,name_ru,group',
                'position:id,name'
            ])->paginate($per_page);

        $data = PaginateResource::make($workers, WorkerPositionResource::class);
        return Helper::response(true, $data);
    }

    public function optimization(Request $request): JsonResponse
    {
        $request->validate([
            'department_id' => 'required|exists:departments,id',
        ]);

        $groups = DepartmentPosition::query()
            ->where('department_id', $request->department_id)
            ->select('position_id')
            ->groupBy('position_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $samePositions = DepartmentPosition::query()
                ->where('department_id', $request->department_id)
                ->where('position_id', $group->position_id)->get();

            $main = $samePositions->sortBy('id')->first();

            $totalRate = $samePositions->sum('rate');

            if (!$main) {
                continue;
            }

            WorkerPosition::whereIn('department_position_id', $samePositions->pluck('id'))
                ->update(['department_position_id' => $main->id]);

            DepartmentPosition::where('department_id', $request->department_id)
                ->where('position_id', $group->position_id)
                ->where('id', '!=', $main->id)
                ->delete();

            $main->rate = $totalRate;
            $main->save();
        }

        return Helper::response(trans('messages.successfully_optimizated'));
    }

    public function deletePosition($departmentPositionId): JsonResponse
    {
        return new DepartmentPositionController()->destroy($departmentPositionId);
    }

    public function deleteDepartment($departmentId): JsonResponse
    {
        return new DepartmentController()->destroy($departmentId);
    }

    public function orderable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:department,position',
            'organization_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'order' => 'required|array',
            'order.*.id' => 'required|integer',
            'order.*.sort' => 'required|integer',
        ]);
        DB::transaction(function () use ($data) {

            foreach ($data['order'] as $row) {

                if ($data['type'] === 'department') {
                    Department::query()
                        ->where('id', $row['id'])
                        ->where('organization_id', $data['organization_id'])
                        ->update(['sort' => $row['sort']]);
                }

                if ($data['type'] === 'position') {
                    DepartmentPosition::query()
                        ->where('id', $row['id'])
                        ->where('department_id', $data['department_id'])
                        ->update(['sort' => $row['sort']]);
                }
            }
        });
        return Helper::response(trans('messages.successfully_sorted'));
    }

}
