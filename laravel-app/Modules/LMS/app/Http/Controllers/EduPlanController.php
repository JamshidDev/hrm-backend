<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\EduPlanWorker;
use Modules\LMS\Transformers\AttachedWorkersResource;
use Modules\LMS\Transformers\EduPlanListResource;
use Modules\LMS\Transformers\EduPlanMinResource;

class EduPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $data = EduPlan::query()
            ->filter($user, request()->all())
            ->with([
                'specialization',
                'learning_center',
                'subjects'
            ])
            ->when(request('year'), fn($query, $year) => $query->whereYear('start_date', $year))
            ->when(request('month'), fn($query, $month) => $query->whereMonth('start_date', $month))
            ->withCount('workers')
            ->withCount('exams')
            ->when(request('search'), fn($query, $search) => $query->whereLike('name', "%$search%"))
            ->when(request('learning_center_id'), function ($query, $learningCenterId) {
                $query->where('learning_center_id', $learningCenterId);
            })
            ->paginate($per_page);

        $data = PaginateResource::make($data, EduPlanListResource::class);

        return Helper::response(true, $data);
    }

    public function list(): JsonResponse
    {
        $per_page = request('per_page', 50);

        $data = EduPlan::query()
            ->with(['specialization', 'learning_center'])
            ->whereYear('start_date', date('Y'))
            ->paginate($per_page);

        $data = PaginateResource::make($data, EduPlanMinResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'specialization_id' => 'required',
            'start_date' => 'required',
            'hours' => 'required',
            'name' => 'required',
            'learning_center_id' => 'required',
            'count_groups' => 'required',
            'count_workers' => 'required',
            'end_date' => 'nullable|date_format:Y-m-d',
            'serial' => 'nullable|integer',
        ]);

        $eduPlan = EduPlan::create($validated);

        if ($request->subjects) {
            $eduPlan->subjects()->sync($request->subjects);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, EduPlan $eduPlan): JsonResponse
    {
        $validated = $request->validate([
            'specialization_id' => 'sometimes|required',
            'start_date' => 'sometimes|required',
            'hours' => 'sometimes|required',
            'name' => 'sometimes|required',
            'learning_center_id' => 'sometimes|required',
            'count_groups' => 'sometimes|required',
            'count_workers' => 'sometimes|required',
            'end_date' => 'nullable|date_format:Y-m-d',
            'serial' => 'nullable|integer',
        ]);

        $eduPlan->update($validated);

        if ($request->subjects) {
            $eduPlan->subjects()->sync($request->subjects);
        }

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(EduPlan $eduPlan): JsonResponse
    {
        $eduPlan->delete();
        $eduPlan->subjects()->detach();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }

    public function attachedWorkersToEduPlan($eduPlanId, Request $request): JsonResponse
    {
//        $user = auth()->user();
        $attachedWorkers = EduPlanWorker::query()
            ->with([
                'worker_position:id,department_id,position_id,organization_id,worker_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,full_name,group',
                'worker_position.worker:id,last_name,first_name,middle_name,photo',
                'worker_position.worker.phones',
            ])
            ->whereHas('worker_position.worker')
            ->where('edu_plan_id', $eduPlanId)
            ->orderByDesc('edu_plan_id')
            ->paginate(request('per_page', 10));

        $attachedWorkers = PaginateResource::make($attachedWorkers, AttachedWorkersResource::class);
        return Helper::response(true, $attachedWorkers);
    }

    public function detachWorkerInEduPlan($eduPlanId, Request $request): JsonResponse
    {
        $request->validate(['ids' => 'required|array',]);
        EduPlanWorker::query()->whereIn('id', $request->ids)->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
