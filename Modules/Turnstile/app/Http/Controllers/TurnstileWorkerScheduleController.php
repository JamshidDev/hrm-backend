<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule\TurnstileWorkerScheduleGeneratePreviewRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule\TurnstileWorkerScheduleIndexRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule\TurnstileWorkerScheduleShowRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule\TurnstileWorkerScheduleStoreRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerSchedule\TurnstileWorkerScheduleUpdateRequest;
use Modules\Turnstile\Services\TurnstileWorkerScheduleService;

class TurnstileWorkerScheduleController extends Controller
{
    public function __construct(
        private readonly TurnstileWorkerScheduleService $service
    ) {
    }

    public function generate(TurnstileWorkerScheduleGeneratePreviewRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->generatePreview($request->validated()));
    }

    public function index(TurnstileWorkerScheduleIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginate($request->validated(), auth()->user()));
    }

    public function indexTurnstileSheet(TurnstileWorkerScheduleIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginateWithTurnstile($request->validated(), auth()->user()));
    }

    public function update(TurnstileWorkerScheduleUpdateRequest $request, int $workerPositionId): JsonResponse
    {
        $this->service->update($workerPositionId, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function store(TurnstileWorkerScheduleStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show(int $workerPositionId, TurnstileWorkerScheduleShowRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->show($workerPositionId, $request->validated()));
    }
}
