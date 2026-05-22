<?php

namespace Modules\Integration\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Services\WorkerPositionService;
use Modules\Integration\Http\Requests\Station\StationIndexRequest;
use Modules\Integration\Services\StationService;

class StationController extends Controller
{
    public function __construct(
        public StationService $service,
        protected WorkerPositionService $positionService
    )
    {
    }

    public function index(StationIndexRequest $request, $code): JsonResponse
    {
        return $this->service->index($request->validated(), $code);
    }

    public function resume($code, $workerUuid)
    {
        $worker = WorkerPosition::query()->whereUuid($workerUuid)->firstOrFail();
        return new $this->positionService->downloadResume($worker->uuid);
    }

    public function show($code, $workerUuid): JsonResponse
    {
        $user = auth()->user();
        return $this->service->show($workerUuid, $user);
    }

    public function stats($code): JsonResponse
    {
        return $this->service->stats($code);
    }
}
