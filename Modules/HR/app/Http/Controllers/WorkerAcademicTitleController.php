<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerAcademicTitle\WorkerAcademicTitleStoreRequest;
use Modules\HR\Http\Requests\WorkerAcademicTitle\WorkerAcademicTitleUpdateRequest;
use Modules\HR\Models\WorkerAcademicTitle;
use Modules\HR\Services\WorkerAcademicTitleService;
use Modules\HR\Transformers\Worker\WorkerAcademicTitleResource;

class WorkerAcademicTitleController extends Controller
{
    public function __construct(
        private readonly WorkerAcademicTitleService $service
    )
    {
    }
    public function index(): JsonResponse
    {
        $data = WorkerAcademicTitle::query()
            ->filter()
            ->get();
        $data = WorkerAcademicTitleResource::collection($data);
        return Helper::response(true, $data);
    }

    public function store(WorkerAcademicTitleStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerAcademicTitleUpdateRequest $request, $workerAcademicTitleId): JsonResponse
    {
        $workerAcademicTitle = WorkerAcademicTitle::findOrFail($workerAcademicTitleId);
        $this->service->update(
            $workerAcademicTitle,
            $request->toDto($workerAcademicTitle->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerAcademicTitleId): JsonResponse
    {
        $workerAcademicTitle = WorkerAcademicTitle::findOrFail($workerAcademicTitleId);
        $this->service->delete($workerAcademicTitle);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
