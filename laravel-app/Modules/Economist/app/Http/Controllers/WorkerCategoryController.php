<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Economist\Http\Requests\WorkerCategory\WorkerCategoryIndexRequest;
use Modules\Economist\Http\Requests\WorkerCategory\WorkerCategoryOrganizationReportRequest;
use Modules\Economist\Http\Requests\WorkerCategory\WorkerCategoryStoreRequest;
use Modules\Economist\Http\Requests\WorkerCategory\WorkerCategoryUpdateRequest;
use Modules\Economist\Services\WorkerCategoryService;

class WorkerCategoryController extends Controller
{
    public function __construct(
        private readonly WorkerCategoryService $service
    ) {
    }

    public function index(WorkerCategoryIndexRequest $request): JsonResponse
    {
        $data = $this->service->index(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, $data);
    }

    public function reportByOrganizations(WorkerCategoryOrganizationReportRequest $request): JsonResponse
    {
        $data = $this->service->reportByOrganizations(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, $data);
    }

    public function store(WorkerCategoryStoreRequest $request): JsonResponse
    {
        $this->service->store(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerCategoryUpdateRequest $request, int $workerSalaryCategoryId): JsonResponse
    {
        $this->service->update($workerSalaryCategoryId, $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(int $workerCategoryId): JsonResponse
    {
        $this->service->destroy($workerCategoryId);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
