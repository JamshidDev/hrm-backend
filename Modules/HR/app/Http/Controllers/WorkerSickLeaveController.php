<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerSickLeave\WorkerSickLeaveStoreRequest;
use Modules\HR\Http\Requests\WorkerSickLeave\WorkerSickLeaveUpdateRequest;
use Modules\HR\Models\WorkerSickLeave;
use Modules\HR\Services\WorkerSickLeaveService;
use Modules\HR\Transformers\Worker\WorkerSickLeaveResource;

class WorkerSickLeaveController extends Controller
{
    public function __construct(
        private readonly WorkerSickLeaveService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $data = WorkerSickLeave::query()
            ->filter()
            ->get();

        $data = WorkerSickLeaveResource::collection($data);
        return Helper::response(true, $data);
    }

    public function store(WorkerSickLeaveStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show($workerSickLeaveId): JsonResponse
    {
        $workerSickLeave = WorkerSickLeave::findOrFail($workerSickLeaveId);
        $data = WorkerSickLeaveResource::make($workerSickLeave);

        return Helper::response(true, $data);
    }

    public function update(WorkerSickLeaveUpdateRequest $request, $workerSickLeaveId): JsonResponse
    {
        $workerSickLeave = WorkerSickLeave::findOrFail($workerSickLeaveId);
        $this->service->update($workerSickLeave, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerSickLeaveId): JsonResponse
    {
        $workerSickLeave = WorkerSickLeave::findOrFail($workerSickLeaveId);
        $this->service->delete($workerSickLeave);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
