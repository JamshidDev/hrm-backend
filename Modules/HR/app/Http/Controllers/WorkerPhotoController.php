<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerPhoto\WorkerPhotoStoreRequest;
use Modules\HR\Http\Requests\WorkerPhoto\WorkerPhotoUpdateRequest;
use Modules\HR\Models\WorkerPhoto;
use Modules\HR\Services\WorkerPhotoService;
use Modules\HR\Transformers\Worker\WorkerPhotosResource;

class WorkerPhotoController extends Controller
{
    public function __construct(
        private readonly WorkerPhotoService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $photos = WorkerPhoto::where('worker_id', request('worker_id'))->get();
        return Helper::response(true, WorkerPhotosResource::collection($photos));
    }

    public function store(WorkerPhotoStoreRequest $request): JsonResponse
    {
        $photos = $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'), WorkerPhotosResource::collection($photos));
    }

    public function update(WorkerPhotoUpdateRequest $request, $workerPhotoId): JsonResponse
    {
        $this->service->update($workerPhotoId, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerPhotoId): JsonResponse
    {
        $this->service->delete($workerPhotoId);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
