<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Http\Requests\WorkerPassport\WorkerPassportStoreRequest;
use Modules\HR\Http\Requests\WorkerPassport\WorkerPassportUpdateRequest;
use Modules\HR\Models\WorkerPassport;
use Modules\HR\Services\WorkerPassportService;
use Modules\HR\Transformers\Worker\WorkerPassportResource;

class WorkerPassportController extends Controller
{
    public function __construct(
        private readonly WorkerPassportService $service
    ) {}

    public static function middleware(): array
    {
        return [
            new Middleware('can:worker-passport-write', only: ['destroy', 'store', 'update'])
        ];
    }

    public function index(): JsonResponse
    {
        $passports = WorkerPassport::query()
            ->filter()
            ->get();

        return Helper::response(
            true,
            WorkerPassportResource::collection($passports)
        );
    }

    public function store(WorkerPassportStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(
        WorkerPassportUpdateRequest $request,
        WorkerPassport $workerPassport
    ): JsonResponse {
        $this->service->update(
            $workerPassport,
            $request->toDto($workerPassport->worker_id)
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(WorkerPassport $workerPassport): JsonResponse
    {
        $this->service->delete($workerPassport);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
