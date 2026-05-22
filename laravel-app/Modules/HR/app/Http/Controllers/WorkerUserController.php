<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\User\UserWorkerRolesResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Modules\HR\Http\Requests\WorkerUser\WorkerUserIndexRequest;
use Modules\HR\Services\WorkerUserService;
use Spatie\Permission\Models\Role;

class WorkerUserController extends Controller
{
    public function __construct(
        private readonly WorkerUserService $service
    )
    {
    }

    public function index(WorkerUserIndexRequest $request): JsonResponse
    {
        $result = $this->service->list(
            $request->validated(),
            auth()->user()
        );

        if (!$result) {
            return Helper::response(trans('messages.successfully_exported'));
        }

        return Helper::response(true, PaginateResource::make($result, UserWorkerRolesResource::class));
    }

    public function attachRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'uuid' => ['required', 'exists:users,uuid'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'role' => ['string'],
            'role_id' => ['string'],
        ]);
        $roleId = Role::findByName($data['role_id'])?->id;
        $this->service->attachRole(
            $data['uuid'],
            $data['organization_id'],
            $data['role'] ?? null,
            $roleId,
        );

        return Helper::response(trans('messages.role_successfully_assigned'));
    }

    public function detachRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'uuid' => ['required', 'exists:users,uuid'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'role' => ['nullable', 'string'],
            'role_id' => ['nullable', 'integer', 'exists:roles,id'],
        ]);

        $this->service->detachRole(
            $data['uuid'],
            $data['organization_id'],
            $data['role'] ?? null,
            $data['role_id'] ?? null,
        );

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'uuid' => ['required', 'exists:users,uuid'],
            'password' => ['nullable',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
            ]
        ]);

        $this->service->updatePassword($data);

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'uuid' => ['required', 'exists:users,uuid'],
            'phones' => ['required', 'array'],
            'user_phone' => ['required', 'max:9', 'min:9'],
        ]);

        $this->service->update($data);
        return Helper::response(trans('messages.successfully_updated'));
    }
}
