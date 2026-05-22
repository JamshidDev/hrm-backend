<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerUniversity\WorkerUniversityStoreRequest;
use Modules\HR\Http\Requests\WorkerUniversity\WorkerUniversityUpdateRequest;
use Modules\HR\Models\WorkerUniversity;
use Modules\HR\Services\WorkerUniversityService;
use Modules\HR\Transformers\Worker\University\WorkerUniversityResource;

class WorkerUniversityController extends Controller
{
    public function __construct(
        private readonly WorkerUniversityService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $universities = WorkerUniversity::query()
            ->filter()
            ->search()
            ->with(['speciality', 'university.city.region'])
            ->orderByDesc('sort')
            ->paginate(request('per_page', 10));

        return Helper::response(
            true,
            PaginateResource::make($universities, WorkerUniversityResource::class)
        );
    }

    public function store(WorkerUniversityStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerUniversityUpdateRequest $request, $workerUniversityId): JsonResponse
    {
        $workerUniversity = WorkerUniversity::findOrFail($workerUniversityId);
        $this->service->update(
            $workerUniversity,
            $request->toDto($workerUniversity->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerUniversityId): JsonResponse
    {
        $workerUniversity = WorkerUniversity::findOrFail($workerUniversityId);
        $this->service->delete($workerUniversity);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
