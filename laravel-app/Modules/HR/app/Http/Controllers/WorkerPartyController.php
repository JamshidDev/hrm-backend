<?php

namespace Modules\HR\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Http\Requests\WorkerParty\WorkerPartyStoreRequest;
use Modules\HR\Http\Requests\WorkerParty\WorkerPartyUpdateRequest;
use Modules\HR\Models\WorkerParty;
use Modules\HR\Services\WorkerPartyService;
use Modules\HR\Transformers\Worker\WorkerPartyResource;

class WorkerPartyController extends Controller
{
    public function __construct(
        private readonly WorkerPartyService $service
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $phones = WorkerParty::query()->where('worker_id', Helper::idUuid($request->uuid))->get();
        return Helper::response(true, WorkerPartyResource::collection($phones));
    }

    public function store(WorkerPartyStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerPartyUpdateRequest $request,
        WorkerParty              $workerParty
    ): JsonResponse
    {
        $this->service->update(
            $workerParty,
            $request->toDto($workerParty->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerParty $workerParty): JsonResponse
    {
        $this->service->delete($workerParty);
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
