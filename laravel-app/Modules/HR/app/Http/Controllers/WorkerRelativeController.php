<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Http\Requests\WorkerRelative\WorkerRelativeStoreRequest;
use Modules\HR\Http\Requests\WorkerRelative\WorkerRelativeUpdateRequest;
use Modules\HR\Models\WorkerRelative;
use Modules\HR\Services\WorkerRelativeService;
use Modules\HR\Transformers\Worker\Relative\WorkerRelativeResource;

class WorkerRelativeController extends Controller
{
    public function __construct(
        private readonly WorkerRelativeService $service
    ) {}

    public function index(): JsonResponse
    {
        $data = WorkerRelative::query()
            ->filter()
            ->search()
            ->with('relative_worker')
            ->orderBy('sort')
            ->with('disabilities')
            ->get();

        return Helper::response(
            true,
            WorkerRelativeResource::collection($data)
        );
    }

    public function store(WorkerRelativeStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerRelativeUpdateRequest $request,
        WorkerRelative $workerRelative
    ): JsonResponse {
        $this->service->update(
            $workerRelative,
            $request->toDto($workerRelative->worker_id)
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerRelative $workerRelative): JsonResponse
    {
        $this->service->delete($workerRelative);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function sortable(Request $request): JsonResponse
    {
        $this->service->sort($request->orders ?? []);

        return Helper::response(trans('messages.successfully_sorted'));
    }
}
