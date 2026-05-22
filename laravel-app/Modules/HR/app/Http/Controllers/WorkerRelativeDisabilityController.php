<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerRelativeDisability\WorkerRelativeDisabilityStoreRequest;
use Modules\HR\Http\Requests\WorkerRelativeDisability\WorkerRelativeDisabilityUpdateRequest;
use Modules\HR\Models\WorkerRelativeDisability;
use Modules\HR\Services\WorkerRelativeDisabilityService;
use Modules\HR\Transformers\Worker\WorkerDisabilityResource;

class WorkerRelativeDisabilityController extends Controller
{

    public function __construct(
        private readonly WorkerRelativeDisabilityService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $data = WorkerRelativeDisability::query()
            ->filter()
            ->get();

        $data = WorkerDisabilityResource::collection($data);
        return Helper::response(true, $data);
    }

    public function store(WorkerRelativeDisabilityStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerRelativeDisabilityUpdateRequest $request, $workerRelativeDisabilityId): JsonResponse
    {
        $workerRelativeDisability = WorkerRelativeDisability::findOrFail($workerRelativeDisabilityId);
        $this->service->update($workerRelativeDisability, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerRelativeDisabilityId): JsonResponse
    {
        $workerRelativeDisability = WorkerRelativeDisability::findOrFail($workerRelativeDisabilityId);
        $this->service->delete($workerRelativeDisability);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
