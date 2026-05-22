<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Http\Requests\TurnstileScheduleGroup\TurnstileScheduleGroupIndexRequest;
use Modules\Turnstile\Http\Requests\TurnstileScheduleGroup\TurnstileScheduleGroupUpdateRequest;
use Modules\Turnstile\Http\Requests\TurnstileScheduleGroup\TurnstileScheduleGroupWorkersRequest;
use Modules\Turnstile\Services\TurnstileScheduleGroupService;
use Modules\Turnstile\Transformers\WorkerSchedule\GroupScheduleShowResource;
use Modules\Turnstile\Transformers\WorkerSchedule\ScheduleGroupResource;

class TurnstileScheduleGroupController extends Controller
{
    public function __construct(public TurnstileScheduleGroupService $service)
    {
    }

    public function groups(TurnstileScheduleGroupIndexRequest $request): JsonResponse
    {
        $data = $this->service->index(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, PaginateResource::make($data, ScheduleGroupResource::class));
    }

    public function groupWorkers(TurnstileScheduleGroupWorkersRequest $request): JsonResponse
    {
        $data = $this->service->groupWorkers($request->validated());
        return Helper::response(true, PaginateResource::make($data, GroupScheduleShowResource::class));
    }

    public function deleteGroup($groupId): JsonResponse
    {
        $this->service->destroy($groupId);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function updateGroup(TurnstileScheduleGroupUpdateRequest $request, $groupId): ?JsonResponse
    {
        $this->service->update($groupId, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }
}
