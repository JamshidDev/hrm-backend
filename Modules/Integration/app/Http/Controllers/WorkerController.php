<?php

namespace Modules\Integration\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Integration\Http\Requests\Worker\CheckWorkerRequest;
use Modules\Integration\Http\Requests\Worker\GetStatementMonthRequest;
use Modules\Integration\Http\Requests\Worker\GetStatementRequest;
use Modules\Integration\Http\Requests\Worker\GetWorkersRequest;
use Modules\Integration\Services\IntegrationWorkerService;

class WorkerController extends Controller
{
    public function __construct(
        public IntegrationWorkerService $service
    )
    {
    }

    public function checkWorker(CheckWorkerRequest $request): JsonResponse
    {
        return $this->service->checkWorker($request->validated());
    }

    public function getStatements(GetStatementRequest $request): JsonResponse
    {
        return $this->service->getStatements($request->validated());
    }

    public function getStatementMonths(GetStatementMonthRequest $request): JsonResponse
    {
        return $this->service->getStatementMonths($request->validated());
    }

    public function workers(GetWorkersRequest $request): JsonResponse
    {
        $user = auth()->user();
        return $this->service->workers($request->validated(), $user);
    }
}
