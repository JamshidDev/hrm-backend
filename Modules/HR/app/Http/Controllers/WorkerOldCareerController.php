<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Http\Requests\WorkerOldCareer\WorkerOldCareerStoreRequest;
use Modules\HR\Http\Requests\WorkerOldCareer\WorkerOldCareerUpdateRequest;
use Modules\HR\Models\WorkerOldCareer;
use Modules\HR\Services\WorkerOldCareerService;
use Modules\HR\Transformers\Worker\OldCareer\WorkerOldCareerResource;

class WorkerOldCareerController extends Controller
{
    public function __construct(
        private readonly WorkerOldCareerService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $data = WorkerOldCareer::query()
            ->filter()
            ->search()
            ->orderBy('sort')
            ->get();

        return Helper::response(true, WorkerOldCareerResource::collection($data));
    }

    public function store(WorkerOldCareerStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerOldCareerUpdateRequest $request,
        WorkerOldCareer              $workerOldCareer
    ): JsonResponse
    {
        $this->service->update(
            $workerOldCareer,
            $request->toDto($workerOldCareer->worker_id)
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerOldCareer $workerOldCareer): JsonResponse
    {
        $this->service->delete($workerOldCareer);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function sortable(Request $request): JsonResponse
    {
        $this->service->sort($request->orders ?? []);
        return Helper::response(trans('messages.successfully_sorted'));
    }

}
