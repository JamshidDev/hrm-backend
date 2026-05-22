<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Http\Requests\WorkerPhone\WorkerPhoneStoreRequest;
use Modules\HR\Http\Requests\WorkerPhoto\WorkerPhotoUpdateRequest;
use Modules\HR\Models\WorkerPhone;
use Modules\HR\Services\WorkerPhoneService;
use Modules\HR\Transformers\Worker\WorkerPhonesResource;

class WorkerPhoneController extends Controller
{
    public function __construct(
        private readonly WorkerPhoneService $service
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $phones = WorkerPhone::query()->where('worker_id', Helper::idUuid($request->uuid))->get();
        return Helper::response(
            true,
            WorkerPhonesResource::collection($phones)
        );
    }

    public function store(WorkerPhoneStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerPhotoUpdateRequest $request,
        WorkerPhone              $workerPhone
    ): JsonResponse
    {
        $this->service->update(
            $workerPhone,
            $request->toDto($workerPhone->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerPhone $workerPhone): JsonResponse
    {
        $this->service->delete($workerPhone);
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
