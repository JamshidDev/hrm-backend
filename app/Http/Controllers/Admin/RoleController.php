<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Role\RoleIndexRequest;
use App\Http\Requests\Role\RoleStoreRequest;
use App\Http\Requests\Role\RoleUpdateRequest;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private readonly RoleService $service)
    {
    }

    public function index(RoleIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->index($request->validated()));
    }

    public function store(RoleStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(RoleUpdateRequest $request, Role $role): JsonResponse
    {
        $this->service->update($role, $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->service->destroy($role);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
