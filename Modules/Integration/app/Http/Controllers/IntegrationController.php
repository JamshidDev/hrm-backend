<?php

namespace Modules\Integration\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Enums\DepartmentLevelEnum;
use Modules\HR\Models\Med;
use Modules\HR\Transformers\Med\WorkerMedResource;
use Modules\Integration\Http\Requests\Integration\IntegrationContractsRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationDashboardRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationGetDepartmentAllRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationPositionRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationTurnstileEventsByDayRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationTurnstileEventsByMonthRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationWorkerByPinRequest;
use Modules\Integration\Http\Requests\Integration\IntegrationWorkersRequest;
use Modules\Integration\Services\IntegrationService;

class IntegrationController extends Controller
{
    public function __construct(
        public IntegrationService $service
    )
    {
    }

    public function positions(IntegrationPositionRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->positions($request->validated()));
    }

    public function workers(IntegrationWorkersRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->workers($request->validated()));
    }

    public function meds($workerId): JsonResponse
    {
        $meds = Med::query()->where('worker_id', $workerId)->get();
        return Helper::response(true, WorkerMedResource::collection($meds));
    }

    public function contracts(IntegrationContractsRequest $request): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->contracts($request->validated(), $user));
    }

    public function getDepartmentsAll(IntegrationGetDepartmentAllRequest $request): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->getDepartmentsAll($request->validated(), $user));
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'department_levels' => DepartmentLevelEnum::list()
        ]);
    }

    public function workerByPin(IntegrationWorkerByPinRequest $request): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->workerByPin($request->validated(), $user));
    }

    public function showWorker($uuid): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->showWorker($uuid, $user));
    }

    public function showWorkerTurnstileEventsByMonth($uuid, IntegrationTurnstileEventsByMonthRequest $request): JsonResponse
    {
        $user = auth()->user();
        return $this->service->showWorkerTurnstileEventsByMonth($uuid, $request->validated(), $user);
    }

    public function showWorkerTurnstileEventsByDay($uuid, IntegrationTurnstileEventsByDayRequest $request): JsonResponse
    {
        $user = auth()->user();
        return $this->service->showWorkerTurnstileEventsByDay($uuid, $request->validated(), $user);
    }

    public function dashboard(IntegrationDashboardRequest $request): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->dashboard($request->validated(), $user));
    }
}
