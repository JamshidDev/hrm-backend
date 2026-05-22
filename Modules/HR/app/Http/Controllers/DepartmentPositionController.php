<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Http\Requests\DepartmentPosition\DepartmentPositionIndexRequest;
use Modules\HR\Http\Requests\DepartmentPosition\DepartmentPositionStoreRequest;
use Modules\HR\Http\Requests\DepartmentPosition\DepartmentPositionUpdateRequest;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Services\DepartmentPositionService;
use Modules\HR\Transformers\DepartmentPosition\DepartmentPositionResource;
use Modules\HR\Transformers\DepartmentPosition\DepartmentPositionWithJoinResource;

class DepartmentPositionController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:hr-positions-write', only: ['store', 'update', 'destroy'])
        ];
    }

    public function __construct(
        public DepartmentPositionService $service
    )
    {
    }

    public function index(DepartmentPositionIndexRequest $request): JsonResponse
    {
        $data = $this->service->index(
            $request->validated(),
            auth()->user()
        );

        $data = PaginateResource::make($data, DepartmentPositionWithJoinResource::class);

        return Helper::response(true, $data);
    }

    public function show(DepartmentPosition $departmentPosition): JsonResponse
    {
        $departmentPosition->load([
            'organization:id,name,name_en,name_ru,group',
            'position:id,name,name_ru,name_en',
            'department:id,name,level',
        ]);

        return Helper::response(true, new DepartmentPositionResource($departmentPosition));
    }

    public function store(DepartmentPositionStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(DepartmentPositionUpdateRequest $request, $departmentPositionId): JsonResponse
    {
        $departmentPosition = DepartmentPosition::findOrFail($departmentPositionId);
        $this->service->update(
            $departmentPosition,
            $request->validated()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($departmentPositionId): JsonResponse
    {
        $departmentPosition = DepartmentPosition::findOrFail($departmentPositionId);
        $this->service->delete($departmentPosition);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
