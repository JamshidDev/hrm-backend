<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerMilitary\WorkerMilitaryStoreRequest;
use Modules\HR\Http\Requests\WorkerMilitary\WorkerMilitaryUpdateRequest;
use Modules\HR\Models\WorkerMilitaryService;
use Modules\HR\Services\WorkerMilitaryServiceService;
use Modules\HR\Transformers\Worker\WorkerMilitaryServiceResource;

class WorkerMilitaryServiceController extends Controller
{
    public function __construct(
        private readonly WorkerMilitaryServiceService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $items = WorkerMilitaryService::where('worker_id', Helper::idUuid(request('uuid')))->get();
        return Helper::response(true, WorkerMilitaryServiceResource::collection($items));
    }

    public function store(WorkerMilitaryStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerMilitaryUpdateRequest $request,
        WorkerMilitaryService       $workerMilitaryService
    ): JsonResponse
    {
        $this->service->update(
            $workerMilitaryService,
            $request->toDto($workerMilitaryService)
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerMilitaryService $workerMilitaryService): JsonResponse
    {
        $this->service->delete($workerMilitaryService);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
