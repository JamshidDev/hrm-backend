<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Economist\Http\Requests\Economist\EconomistRefreshWorkersPinsRequest;
use Modules\Economist\Http\Requests\Economist\EconomistStructureRequest;
use Modules\Economist\Http\Requests\Economist\EconomistUpdateUploadStatusRequest;
use Modules\Economist\Http\Requests\Economist\EconomistUploadHistoriesRequest;
use Modules\Economist\Services\EconomistService;
use Modules\Economist\Transformers\StructureResource;

class EconomistController extends Controller
{
    public function __construct(
        private readonly EconomistService $service
    ) {
    }

    public function structure(EconomistStructureRequest $request): JsonResponse
    {
        [$children, $deadline, $now] = $this->service->structure(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, StructureResource::collectionWithDeadline($children, $deadline, $now));
    }

    public function updateUploadStatus(EconomistUpdateUploadStatusRequest $request): JsonResponse
    {
        $this->service->updateUploadStatus(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function uploadHistories(EconomistUploadHistoriesRequest $request): JsonResponse
    {
        $data = $this->service->uploadHistories($request->validated());

        return Helper::response(true, $data);
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, $this->service->enums());
    }

    public function refreshWorkersPins(EconomistRefreshWorkersPinsRequest $request): JsonResponse
    {
        $this->service->refreshWorkersPins(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }
}
