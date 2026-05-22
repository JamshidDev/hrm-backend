<?php

namespace Modules\Integration\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Integration\Http\Requests\MobileFace\SendEventRequest;
use Modules\Integration\Http\Requests\MobileFace\WorkerSchedulesRequest;
use Modules\Integration\Http\Requests\Worker\CheckWorkerRequest;
use Modules\Integration\Services\MobileFaceService;
use Modules\Turnstile\Models\TerminalMobileEvent;

class MobileFaceController extends Controller
{
    public function __construct(
        public MobileFaceService $service
    )
    {
    }
    public function sendEvent(SendEventRequest $request): JsonResponse
    {
        $newEvent = TerminalMobileEvent::create([
            'photo' => $request->photo,
            'lat' => $request->lat,
            'lng' => $request->lng,
            'pin' => $request->pin,
        ]);

        return $this->service->sendEvent($request->validated(), $newEvent);
    }

    public function checkWorker(CheckWorkerRequest $request): JsonResponse
    {
        return $this->service->checkWorker($request->validated());
    }

    public function schedules(WorkerSchedulesRequest $request): JsonResponse
    {
       return $this->service->schedules($request->validated());
    }
}
