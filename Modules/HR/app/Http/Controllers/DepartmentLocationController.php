<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Http\Requests\DepartmentLocation\DepartmentLocationIndexRequest;
use Modules\HR\Http\Requests\DepartmentLocation\DepartmentLocationStoreRequest;
use Modules\HR\Http\Requests\DepartmentLocation\DepartmentLocationUpdateRequest;
use Modules\HR\Services\DepartmentLocationService;
use Modules\HR\Transformers\DepartmentLocation\DepartmentLocationListResource;
use Modules\HR\Transformers\DepartmentLocation\DepartmentLocationResource;
use Modules\HR\Transformers\DepartmentLocation\DepartmentLocationShowResource;

class DepartmentLocationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:hr-departments-write', only: ['store', 'update', 'destroy']),
        ];
    }

    public function __construct(public DepartmentLocationService $service)
    {
    }

    public function index(DepartmentLocationIndexRequest $request): JsonResponse
    {
        $data = $this->service->index($request->validated(), auth()->user());

        return Helper::response(
            true,
            PaginateResource::make($data, DepartmentLocationResource::class)
        );
    }

    public function list(): JsonResponse
    {
        $data = $this->service->list( auth()->user());
        return Helper::response(true, PaginateResource::make($data, DepartmentLocationListResource::class));
    }

    public function store(DepartmentLocationStoreRequest $request): JsonResponse
    {
        $departmentLocation = $this->service->store($request->validated(), auth()->user());
//        $data = new DepartmentLocationResource($departmentLocation->load(['department:id,name,organization_id', 'department.organization:id,name']));
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show($departmentLocationId): JsonResponse
    {
        $departmentLocation = $this->service->findForUser((int)$departmentLocationId, auth()->user());

        return Helper::response(
            true,
            new DepartmentLocationShowResource($this->service->show($departmentLocation))
        );
    }

    public function update(DepartmentLocationUpdateRequest $request, $departmentLocationId): JsonResponse
    {
        $departmentLocation = $this->service->findForUser((int)$departmentLocationId, auth()->user());
        $departmentLocation = $this->service->update($departmentLocation, $request->validated(), auth()->user());

//        $data = new DepartmentLocationResource($departmentLocation);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($departmentLocationId): JsonResponse
    {
        $departmentLocation = $this->service->findForUser((int)$departmentLocationId, auth()->user());
        $this->service->delete($departmentLocation);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
