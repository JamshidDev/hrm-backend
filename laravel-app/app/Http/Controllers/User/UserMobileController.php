<?php

namespace App\Http\Controllers\User;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\MonthStatRequest;
use App\Http\Requests\Mobile\MyResumeRequest;
use App\Http\Requests\Mobile\MySchedulesRequest;
use App\Http\Requests\Mobile\SalaryRequest;
use App\Http\Requests\Mobile\TurnstileEventsRequest;
use App\Http\Requests\Mobile\UpdatePasswordRequest;
use App\Services\Mobile\UserInfoService;
use App\Services\Mobile\UserMobileService;
use App\Services\Mobile\UserScheduleStatsService;
use App\Services\UserTodayScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserMobileController extends Controller
{
    public function __construct(
        private readonly UserMobileService $service,
        private readonly UserInfoService $userInfo,
        private readonly UserScheduleStatsService $scheduleStats,
        private readonly UserTodayScheduleService $todaySchedule,
    ) {
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, $this->service->enums());
    }

    public function myResume(MyResumeRequest $request): BinaryFileResponse
    {
        return $this->service->downloadResume(
            auth()->user(),
            (int)$request->validated('worker_position_id'),
        );
    }

    public function mobileWorkerInfoList(): JsonResponse
    {
        return Helper::response(true, $this->service->workerInfoLabels());
    }

    public function workInfo(): JsonResponse
    {
        return Helper::response(true, $this->userInfo->buildWorkInfo(auth()->user()));
    }

    public function myTodaySchedule(): JsonResponse
    {
        return Helper::response(true, $this->todaySchedule->getTodayScheduleStats(auth()->user()));
    }

    public function showMonthStat(MonthStatRequest $request): JsonResponse
    {
        return Helper::response(true, $this->scheduleStats->monthStat(
            auth()->user(),
            $request->validated('type'),
            (int)$request->validated('year'),
            (int)$request->validated('month'),
        ));
    }

    public function turnstile_events(TurnstileEventsRequest $request): JsonResponse
    {
        return Helper::response(true, $this->scheduleStats->turnstileEvents(
            auth()->user(),
            Carbon::parse($request->validated('date')),
            $request->validated('style'),
        ));
    }

    public function getSalaryMonths(): JsonResponse
    {
        return Helper::response(true, $this->service->salaryMonths(auth()->user()));
    }

    public function getSalary(SalaryRequest $request): JsonResponse
    {
        return response()->json($this->service->salary(
            auth()->user(),
            (int)$request->validated('year'),
            (int)$request->validated('month'),
        ));
    }

    public function documents(): JsonResponse
    {
        return Helper::response(true, [
            'documents' => $this->service->documents(auth()->user()),
        ]);
    }

    public function mySchedules(MySchedulesRequest $request): JsonResponse
    {
        return Helper::response(true, $this->scheduleStats->mySchedules(
            auth()->user(),
            (int)$request->validated('worker_position_id'),
            (int)($request->validated('year') ?? Carbon::now()->year),
            (int)($request->validated('month') ?? Carbon::now()->month),
        ));
    }

    public function update(UpdatePasswordRequest $request): JsonResponse
    {
        $resource = $this->service->changePassword(
            auth()->user(),
            $request->validated('old_password'),
            $request->validated('new_password'),
        );

        return Helper::response(trans('messages.successfully_updated'), $resource);
    }

    public function myLatestVacations(Request $request): JsonResponse
    {
        $data = $this->service->latestVacations(
            auth()->user(),
            $request->integer('worker_position_id') ?: null,
        );

        return Helper::response(true, $data);
    }
}
