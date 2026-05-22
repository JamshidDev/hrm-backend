<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileDayInMonthRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileGenerateFactScheduleRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileGenerateScheduleByWorkerRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileGenerateScheduleRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileReplacementWorkersRequest;
use Modules\Turnstile\Http\Requests\TurnstileWorkerScheduleGenerate\TurnstileScheduleWorkersRequest;
use Modules\Turnstile\Services\TurnstileWorkerScheduleGenerateService;

class TurnstileWorkerScheduleGenerateController extends Controller
{
    public function __construct(
        private readonly TurnstileWorkerScheduleGenerateService $service
    ) {
    }

    public function workers(TurnstileScheduleWorkersRequest $request): JsonResponse
    {
        request()->merge($request->validated());
        return $this->service->workers();
    }

    public function dayInMonth(TurnstileDayInMonthRequest $request): JsonResponse
    {
        return $this->service->dayInMonth($request);
    }

    public function generateSchedule(TurnstileGenerateScheduleRequest $request): JsonResponse
    {
        return $this->service->generateSchedule($request);
    }

    public function generateScheduleByWorker(TurnstileGenerateScheduleByWorkerRequest $request): JsonResponse
    {
        return $this->service->generateScheduleByWorker($request);
    }

    public function replacementWorkers(TurnstileReplacementWorkersRequest $request): ?JsonResponse
    {
        return $this->service->replacementWorkers($request);
    }

    public function generateTurnstileSchedule(TurnstileGenerateFactScheduleRequest $request): JsonResponse
    {
        return $this->service->generateTurnstileSchedule($request);
    }
}
