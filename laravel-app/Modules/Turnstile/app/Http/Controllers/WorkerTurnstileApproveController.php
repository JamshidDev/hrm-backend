<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Http\Requests\WorkerTurnstileApprove\WorkerTurnstileApproveAccessLevelsRequest;
use Modules\Turnstile\Http\Requests\WorkerTurnstileApprove\WorkerTurnstileApproveIndexRequest;
use Modules\Turnstile\Http\Requests\WorkerTurnstileApprove\WorkerTurnstileApproveStatusRequest;
use Modules\Turnstile\Http\Requests\WorkerTurnstileApprove\WorkerTurnstileApproveStoreRequest;
use Modules\Turnstile\Services\WorkerTurnstileApproveService;

class WorkerTurnstileApproveController extends Controller
{
    public function __construct(
        private readonly WorkerTurnstileApproveService $service
    ) {
    }

    public function index(WorkerTurnstileApproveIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginate($request->validated(), auth()->user()));
    }

    public function store(WorkerTurnstileApproveStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated(), auth()->user());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show(int $approvalId): JsonResponse
    {
        return Helper::response(true, $this->service->show($approvalId));
    }

    public function approved(int $approvalId, WorkerTurnstileApproveStatusRequest $request): JsonResponse
    {
        $this->service->approve($approvalId, $request->validated()['status']);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function access_levels(WorkerTurnstileApproveAccessLevelsRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->accessLevels($request->validated()));
    }

    public function destroy(int $approvalId): JsonResponse
    {
        $this->service->destroy($approvalId);
        return Helper::response(trans('messages.successfully_updated'));
    }
}
