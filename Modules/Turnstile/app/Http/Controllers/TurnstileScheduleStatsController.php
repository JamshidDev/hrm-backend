<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Services\TurnstileService;

class TurnstileScheduleStatsController extends Controller
{
    public function __construct(public TurnstileService $service)
    {
    }

    public function statsForTurnstile(): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()));
        return Helper::response(true, $this->service->statsForTurnstile($user, $date));
    }

    public function scheduleStatsByMonth(): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()));
        return Helper::response(true, $this->service->scheduleStatsByMonth($user, $date));
    }

    public function lateAndEarlyStatsGroupedByDays(): JsonResponse
    {
        $date = Carbon::parse(request('date', now()->toDateString()));
        $user = auth()->user();

        return Helper::response(true, $this->service->lateAndEarlyStatsGroupedByDays($user, $date));
    }

    public function statsCurrentEvents(): JsonResponse
    {
        $date = Carbon::parse(request('date', now()->toDateString()));
        $user = auth()->user();

        return response()->json([
            'success' => true,
            'data' => $this->service->statsCurrentEvents($user, $date)
        ]);
    }

    public function dailyAttendanceChart(): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()));

        return Helper::response(true, $this->service->dailyAttendanceChart($user, $date));
    }

    public function devives(): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, $this->service->devives($user));
    }

    public function privilegeTurnstile(): JsonResponse
    {
        $user = auth()->user();
        $date = Carbon::parse(request('date', now()->toDateString()))->toDateString();
        return Helper::response(true, $this->service->privilegeTurnstile($user, $date));

    }

}
