<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\Filter\GetDepartmentPositionsRequest;
use Modules\HR\Http\Requests\Filter\GetWorkersRequest;
use Modules\HR\Services\FilterService;
use Modules\HR\Transformers\Department\DepartmentOrganizationResource;
use Modules\HR\Transformers\Department\DepartmentResource;
use Modules\HR\Transformers\Department\DepartmentTreeMinimalResource;
use Modules\HR\Transformers\DepartmentPosition\DepartmentPositionMinResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionSearchResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class FilterController extends Controller
{
    public function __construct(
        private readonly FilterService $service
    )
    {
    }

    public function getWorkers(GetWorkersRequest $request): JsonResponse
    {
        $data = $this->service->workers(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, PaginateResource::make($data, WorkerPositionSearchResource::class));
    }

    public function getDepartmentsByOrganizations(): JsonResponse
    {
        $data = $this->service->departmentsByOrganizations(request()->all(), auth()->user());

        return Helper::response(true, PaginateResource::make($data, DepartmentOrganizationResource::class));
    }

    public function getDepartments(): JsonResponse
    {
        $data = $this->service->rootDepartments(
            request()->all(),
            auth()->user()
        );

        return Helper::response(true, PaginateResource::make($data, DepartmentResource::class));
    }

    public function getDepartmentsTree(): JsonResponse
    {
        $tree = $this->service->departmentTree(request()->all());

        return Helper::response(true, DepartmentTreeMinimalResource::collection($tree));
    }

    public function getDepartmentPositions(
        GetDepartmentPositionsRequest $request
    ): JsonResponse
    {
        $data = $this->service->departmentPositions(
            $request->validated('department_id')
        );

        return Helper::response(true, DepartmentPositionMinResource::collection($data));
    }

    public function positions(): JsonResponse
    {
        $data = $this->service->positions(request()->all());

        return Helper::response(true, PaginateResource::make($data, PositionMinimalResource::class));
    }

}
