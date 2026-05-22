<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Services\ExamDashboardService;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ExamDashboardService $examDashboardService,
    ) {
    }

    public function workerStatistics(): JsonResponse
    {
        return Helper::response(true, $this->examDashboardService->workerStatistics(
            auth()->user()->worker_id,
            request()->input('from', now()->startOfYear()->toDateString()),
            request()->input('to', now()->toDateString()),
        ));
    }
}
