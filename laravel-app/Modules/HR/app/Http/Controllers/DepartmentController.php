<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Enums\DepartmentLevelEnum;
use Modules\HR\Http\Requests\Department\DepartmentIndexRequest;
use Modules\HR\Http\Requests\Department\DepartmentStoreRequest;
use Modules\HR\Http\Requests\Department\DepartmentUpdateRequest;
use Modules\HR\Models\Department;
use Modules\HR\Services\DepartmentService;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Department\DepartmentResource;
use Modules\HR\Transformers\Department\DepartmentShowResource;
use Modules\HR\Transformers\Department\DepartmentTreeResource;
use Modules\HR\Transformers\Department\DepartmentWithJoinResource;

class DepartmentController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:hr-departments-write', only: ['destroy', 'store', 'update'])
        ];
    }

    public function __construct(
        public DepartmentService $service
    )
    {
    }

    public function index(DepartmentIndexRequest $request): JsonResponse
    {
        $data = $this->service->index(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(true, PaginateResource::make($data, DepartmentWithJoinResource::class));
    }

    public function levels(): JsonResponse
    {
        return Helper::response(true, DepartmentLevelEnum::list());
    }

    public function list(Request $request): JsonResponse
    {
        $data = Department::query()
            ->whereLike('name', "%{$request->search}%")
            ->filterByOrganizations(auth()->user(), request()->all())
            ->paginate(request('per_page', 50));

        return Helper::response(
            true,
            PaginateResource::make($data, DepartmentListResource::class)
        );
    }

    public function store(DepartmentStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show(Department $department): JsonResponse
    {
        $department->load('children.parent');

        return Helper::response(true, [
            'department' => new DepartmentResource($department),
            'children' => DepartmentShowResource::collection($department->children),
        ]);
    }

    public function update(DepartmentUpdateRequest $request, $departmentId): JsonResponse
    {
        $department = Department::query()->findOrFail($departmentId);
        $this->service->update($department, $request->toDto($department));

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($departmentId): JsonResponse
    {
        $department = Department::query()->findOrFail($departmentId);
        $this->service->delete($department);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function departments(Request $request): JsonResponse
    {
        $request->validate([
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'organizations' => 'nullable|string',
            'search' => 'nullable|string'
        ]);
        $tree = $this->service->tree(auth()->user());
        return Helper::response(true, DepartmentTreeResource::collection($tree));
    }

}
