<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUser\AdminRoleIndexRequest;
use App\Http\Requests\AdminUser\AdminUserAssignRoleRequest;
use App\Http\Requests\AdminUser\AdminUserAttachPermissionRequest;
use App\Http\Requests\AdminUser\AdminUserBlockRequest;
use App\Http\Requests\AdminUser\AdminUserCheckTokenRequest;
use App\Http\Requests\AdminUser\AdminUserDetachPermissionRequest;
use App\Http\Requests\AdminUser\AdminUserDirectPermissionIndexRequest;
use App\Http\Requests\AdminUser\AdminUserDetachRoleRequest;
use App\Http\Requests\AdminUser\AdminUserGenerateTokenRequest;
use App\Http\Requests\AdminUser\AdminUserIndexRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use App\Services\AdminUserService;

class AdminUserController extends Controller
{
    public function __construct(private readonly AdminUserService $service)
    {
    }

    public function index(AdminUserIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->index($request->validated()));
    }

    public function directPermissionUsers(AdminUserDirectPermissionIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->directPermissionUsers($request->validated()));
    }

    public function block(AdminUserBlockRequest $request, string $userUuid): JsonResponse
    {
        $this->service->block($userUuid, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function userRoles(string $userUuid): JsonResponse
    {
        return Helper::response(true, $this->service->userRoles($userUuid));
    }

    public function detachUserRoles(string $userUuid, AdminUserDetachRoleRequest $request): JsonResponse
    {
        $this->service->detachUserRole($userUuid, $request->validated());
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function assignRoleToUser(AdminUserAssignRoleRequest $request): JsonResponse
    {
        $this->service->assignRoleToUser($request->validated());
        return Helper::response(trans('messages.role_successfully_assigned'));
    }

    public function roles(AdminRoleIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->roles($request->validated()));
    }

    public function destroy(User $user): JsonResponse
    {
        $this->service->destroy($user);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function loginAsUser(string $userUuid): JsonResponse
    {
        return response()->json([
            'access_token' => $this->service->loginAsUser($userUuid),
            'message' => trans('messages.auth.login_success')
        ]);
    }

    public function getTokenForAdmin(AdminUserGenerateTokenRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->getTokenForAdmin($request->validated()));
    }

    public function checkTokenForAdmin(AdminUserCheckTokenRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->checkTokenForAdmin($request->validated()));
    }

    public function userPermissions(string $userUuid): JsonResponse
    {
        return Helper::response(true, $this->service->userPermissions($userUuid));
    }

    public function attachPermission(string $userUuid, AdminUserAttachPermissionRequest $request): JsonResponse
    {
        $this->service->attachPermission($userUuid, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function detachPermission(string $userUuid, AdminUserDetachPermissionRequest $request): JsonResponse
    {
        $this->service->detachPermission($userUuid, $request->validated());
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
