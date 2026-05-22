<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Permission\PermissionIndexRequest;
use App\Http\Requests\Permission\PermissionStoreRequest;
use App\Http\Requests\Permission\PermissionUpdateRequest;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function __construct(private readonly PermissionService $service)
    {
    }

    public function index(PermissionIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->index($request->validated()));
    }

    public function store(PermissionStoreRequest $request): JsonResponse
    {
        $this->service->store($request->validated());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(PermissionUpdateRequest $request, Permission $permission): JsonResponse
    {
        $this->service->update($permission, $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $this->service->destroy($permission);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
