<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerDisability\WorkerDisabilityStoreRequest;
use Modules\HR\Http\Requests\WorkerDisability\WorkerDisabilityUpdateRequest;
use Modules\HR\Models\WorkerDisability;
use Modules\HR\Services\WorkerDisabilityService;
use Modules\HR\Transformers\Worker\WorkerDisabilityResource;

class WorkerDisabilityController extends Controller
{

    public function __construct(
        private readonly WorkerDisabilityService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $data = WorkerDisability::query()
            ->filter()
            ->get();

        $data = WorkerDisabilityResource::collection($data);
        return Helper::response(true, $data);
    }

    public function store(WorkerDisabilityStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerDisabilityUpdateRequest $request, $workerDisabilityId): JsonResponse
    {
        $workerDisability = WorkerDisability::findOrFail($workerDisabilityId);
        $this->service->update($workerDisability, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerDisabilityId): JsonResponse
    {
        $workerDisability = WorkerDisability::findOrFail($workerDisabilityId);
        $this->service->delete($workerDisability);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
