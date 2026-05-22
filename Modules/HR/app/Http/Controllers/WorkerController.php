<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\DTO\WorkerDTO;
use Modules\HR\Http\Requests\Worker\StoreWorkerRequest;
use Modules\HR\Http\Requests\Worker\UpdateWorkerRequest;
use Modules\HR\Models\Worker;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\HR\Transformers\Worker\WorkerWithPositionResource;

class WorkerController extends Controller
{
    public function __construct(
        private readonly \Modules\HR\Services\WorkerService $service
    )
    {
    }
    public function checkWorker(Request $request): JsonResponse
    {
        $request->validate(['pin' => 'required|max:14|min:14']);

        $worker = Worker::query()
            ->whereLike('pin', $request->pin)
            ->with([
                'positions',
                'positions.organization',
                'positions.department',
                'positions.position'
            ])
            ->first();

        if (!$worker) {
            return Helper::response(trans('messages.not_found'), [], 400);
        }

        $data = new WorkerWithPositionResource($worker);

        return Helper::response(true, $data);
    }

    public function store(StoreWorkerRequest $request): JsonResponse
    {
        $worker = $this->service->store(WorkerDTO::fromRequest($request->validated()));

        return Helper::response(true, new WorkerInfoResource($worker));
    }

    public function update(UpdateWorkerRequest $request, Worker $worker): JsonResponse
    {
        $this->service->update($worker, WorkerDTO::fromRequest($request->validated()));

        return Helper::response(trans('messages.successfully_updated'));
    }



}
