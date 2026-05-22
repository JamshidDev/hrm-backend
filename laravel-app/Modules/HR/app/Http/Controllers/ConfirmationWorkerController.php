<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\ConfirmationWorker\ConfirmationWorkerIndexRequest;
use Modules\HR\Http\Requests\ConfirmationWorker\ConfirmationWorkerStoreRequest;
use Modules\HR\Http\Requests\ConfirmationWorker\ConfirmationWorkerUpdateRequest;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Services\ConfirmationWorkerService;
use Modules\HR\Transformers\ConfirmationWorker\ConfirmationWorkerResource;

class ConfirmationWorkerController extends Controller
{
    public function __construct(
        public ConfirmationWorkerService $service
    )
    {
    }

    public function index(ConfirmationWorkerIndexRequest $request): JsonResponse
    {
        $result = $this->service->index(
            $request->validated(),
            auth()->user()
        );
        $confirmationWorkers = PaginateResource::make($result, ConfirmationWorkerResource::class);
        return Helper::response(true, $confirmationWorkers);
    }

    public function store(ConfirmationWorkerStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(ConfirmationWorkerUpdateRequest $request, $confirmationWorkerId): JsonResponse
    {
        $confirmationWorker = ConfirmationWorker::findOrFail($confirmationWorkerId);
        $this->service->update($confirmationWorker, $request->toDto());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($confirmationWorkerId): JsonResponse
    {
        $confirmationWorker = ConfirmationWorker::findOrFail($confirmationWorkerId);
        $this->service->delete($confirmationWorker);

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
