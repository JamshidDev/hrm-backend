<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\EduPlanWorker;
use Modules\LMS\Transformers\EduPlanAttachedWorkersResource;
use Modules\LMS\Transformers\SearchWorkersResource;

class EduPlanWorkerController extends Controller
{
    public function attachWorkers(Request $request): JsonResponse
    {
        $request->validate([
            'edu_plan_id' => 'required',
            'worker_position_ids' => 'required|array',
        ]);

        $eduPlan = EduPlan::query()->with(['workers'])->findOrFail($request->edu_plan_id);

        if (!$eduPlan) {
            return Helper::response(trans('messages.lms.edu_plan_not_found'));
        }

        $now = now();
        $workerPositions = WorkerPosition::query()
            ->whereIn('id', $request->worker_position_ids)
            ->select(['id', 'worker_id', 'organization_id'])
            ->get()
            ->map(function ($workerPosition) use ($eduPlan, $now) {
                return [
                    'learning_center_id' => $eduPlan->learning_center_id,
                    'edu_plan_id' => $eduPlan->id,
                    'worker_position_id' => $workerPosition->id,
                    'organization_id' => $workerPosition->organization_id,
                    'worker_id' => $workerPosition->worker_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            });

        $attachedWorkerIds = $eduPlan->workers->pluck('id')->toArray();
        $selectedWorkerIds = $workerPositions->pluck('worker_id')->toArray();

        $diffWorkerIds = array_diff($selectedWorkerIds, $attachedWorkerIds);
        $cWorkers = $eduPlan->count_workers * $eduPlan->count_groups;

        if ($cWorkers < count($diffWorkerIds)) {
            return Helper::response(trans('messages.lms.edu_plan_workers_count_invalid'));
        }

        $workerIds = $workerPositions->pluck('worker_id');
        $duplicates = $workerIds->duplicates();

        if ($duplicates->isNotEmpty()) {
            return Helper::responseMsg("Xatolik: Bir nechta lavozimlar bir xil xodimga tegishli", [], 400);
        }

        EduPlanWorker::query()
            ->where('edu_plan_id', $eduPlan->id)
            ->whereIn('worker_id', $workerIds)
            ->forceDelete();

        EduPlanWorker::insert($workerPositions->toArray());

        return Helper::response(trans('messages.successfully_attached'));
    }

    public function attachedWorkers(): JsonResponse
    {
        $user = auth()->user();
        $attachedWorkers = EduPlanWorker::query()
            ->filter($user, request()->all())
            ->when(request('search'), fn($query) => $query->whereHas('worker', function ($query) {
                $query->searchByFullName();
            }))
            ->with([
                'worker_position:id,department_id,position_id,organization_id,worker_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,full_name,group',
                'worker_position.worker:id,last_name,first_name,middle_name,photo',
                'worker_position.worker.phones',
                'edu_plan.specialization',
                'learning_center',
                'certificate'
            ])
            ->when(request('edu_plan_id'), function ($query, $value) {
                $query->where('edu_plan_id', $value);
            })
            ->paginate(request('per_page', 10));

        $attachedWorkers = PaginateResource::make($attachedWorkers, EduPlanAttachedWorkersResource::class);

        return Helper::response(true, $attachedWorkers);
    }

    public function detachWorkers(Request $request): JsonResponse
    {
        $request->validate([
           'ids' => 'required|array',
        ]);

        EduPlanWorker::query()->whereIn('id', $request->ids)->delete();

        return Helper::response(trans('messages.successfully_detached'));
    }

    public function searchWorkers(Request $request): JsonResponse
    {
        $request->validate([
            'edu_plan_id' => 'required|exists:edu_plans,id',
        ]);

        $eduPlan = EduPlan::query()
            ->with('specialization.has_positions')
            ->find($request->edu_plan_id);

        $positionIds = $eduPlan
            ->specialization
            ?->has_positions
            ->pluck('position_id')
            ->toArray();

        if (empty($positionIds)) {
            return Helper::response(trans('messages.lms.edu_plan_specialization_not_found'));
        }

        $per_page = request('per_page', 100);

        $data = WorkerPosition::query()
            ->select(['id', 'organization_id', 'worker_id', 'position_id'])
            ->filter(auth()->user(), request()->all())
            ->search()
//            ->whereIn('position_id', $positionIds)
            ->with([
                'position:id,name',
                'worker:id,last_name,first_name,middle_name'
            ])
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($per_page);

        $workers = PaginateResource::make($data, SearchWorkersResource::class);

        return Helper::response(true, $workers);
    }
}
