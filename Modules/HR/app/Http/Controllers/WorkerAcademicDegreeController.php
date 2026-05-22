<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerAcademicDegree\WorkerAcademicDegreeStoreRequest;
use Modules\HR\Http\Requests\WorkerAcademicDegree\WorkerAcademicDegreeUpdateRequest;
use Modules\HR\Models\WorkerAcademicDegree;
use Modules\HR\Services\WorkerAcademicDegreeService;
use Modules\HR\Transformers\Worker\WorkerAcademicDegreeResource;

class WorkerAcademicDegreeController extends Controller
{
    public function __construct(
        private readonly WorkerAcademicDegreeService $service
    )
    {
    }
    public function index(): JsonResponse
    {
        $data = WorkerAcademicDegree::query()
            ->filter()
            ->get();
        $data = WorkerAcademicDegreeResource::collection($data);
        return Helper::response(true, $data);
    }

    public function store(WorkerAcademicDegreeStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerAcademicDegreeUpdateRequest $request, $workerAcademicDegreeId): JsonResponse
    {
        $workerAcademicDegree = WorkerAcademicDegree::findOrFail($workerAcademicDegreeId);
        $this->service->update(
            $workerAcademicDegree,
            $request->toDto($workerAcademicDegree->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerAcademicDegreeId): JsonResponse
    {
        $workerAcademicDegree = WorkerAcademicDegree::findOrFail($workerAcademicDegreeId);
        $this->service->delete($workerAcademicDegree);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
