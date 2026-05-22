<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Http\Requests\HikCentralWorker\HikCentralWorkerErrorRequest;
use Modules\Turnstile\Http\Requests\HikCentralWorker\HikCentralWorkerRefreshAccessLevelRequest;
use Modules\Turnstile\Http\Requests\HikCentralWorker\HikCentralWorkerShowRequest;
use Modules\Turnstile\Http\Requests\HikCentralWorker\HikCentralWorkerStoreRequest;
use Modules\Turnstile\Http\Requests\HikCentralWorker\HikCentralWorkerUpdateFaceRequest;
use Modules\Turnstile\Services\HikCentralWorkerService;

class HikCentralWorkerController extends Controller
{
    public function __construct(
        private readonly HikCentralWorkerService $service
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        request()->merge($request->all());
        return $this->service->index();
    }

    public function showAccessLevels(HikCentralWorkerShowRequest $request): JsonResponse
    {
        return $this->service->showAccessLevels($request);
    }

    public function showErrorAL(HikCentralWorkerErrorRequest $request): JsonResponse
    {
        return $this->service->showErrorAL($request);
    }

    public function addWorkerToHikCentral(HikCentralWorkerStoreRequest $request): ?JsonResponse
    {
        return $this->service->addWorkerToHikCentral($request);
    }

    public function updateWorkerFace(HikCentralWorkerUpdateFaceRequest $request): JsonResponse
    {
        return $this->service->updateWorkerFace($request);
    }

    public function refreshAccessLevel(HikCentralWorkerRefreshAccessLevelRequest $request): JsonResponse
    {
        return $this->service->refreshAccessLevel($request);
    }

    public function destroy(int $workerId): JsonResponse
    {
        return $this->service->destroy($workerId);
    }
}
