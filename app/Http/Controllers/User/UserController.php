<?php

namespace App\Http\Controllers\User;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\ChangeCurrentOrganizationRequest;
use App\Http\Requests\User\OrganizationHrsRequest;
use App\Http\Requests\User\UpdateOrganizationInfoRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Requests\User\UserMarkNotificationsRequest;
use App\Http\Requests\User\UserNotificationsIndexRequest;
use App\Services\UserService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function logout(): JsonResponse
    {
        $this->userService->logout(auth()->user());

        return Helper::response(trans('messages.successfully_logout'));
    }

    public function notifications(UserNotificationsIndexRequest $request): JsonResponse
    {
        $result = $this->userService->notifications(auth()->user(), $request->filters());

        if (is_int($result)) {
            return Helper::response(true, $result);
        }

        return Helper::response(true, $result['data']);
    }

    public function markAsReadNotifications(UserMarkNotificationsRequest $request): JsonResponse
    {
        $this->userService->markNotificationsAsRead(auth()->user(), $request->validated());

        return Helper::response();
    }

    public function organizationHrs(OrganizationHrsRequest $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->userService->organizationHrs($request->validated('organization_id'))
        );
    }

    public function profile(): JsonResponse
    {
        return Helper::response(true, $this->userService->profile(auth()->user()));
    }

    public function me(): JsonResponse
    {
        return Helper::response(true, $this->userService->me(auth()->user()));
    }

    public function verifyToken(): JsonResponse
    {
        return response()->json($this->userService->verifyToken(auth()->user()));
    }

    public function roles(): JsonResponse
    {
        return Helper::response(true, $this->userService->rolesWithOrganizations(auth()->user()));
    }

    public function changeCurrentOrganization(ChangeCurrentOrganizationRequest $request): JsonResponse
    {
        $this->userService->changeCurrentOrganization(
            auth()->user(),
            $request->validated('organization_id')
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function update(UpdateUserRequest $request): JsonResponse
    {
        try {
            $resource = $this->userService->updateProfile(auth()->user(), $request->validated());
            return Helper::response(trans('messages.successfully_updated'), $resource);
        } catch (Exception $exception) {
            return Helper::response($exception->getMessage(), [], 400);
        }
    }

    public function organizationInfo(): JsonResponse
    {
        return Helper::response(true, $this->userService->organizationInfo(auth()->user()));
    }

    public function updateOrganizationInfo(UpdateOrganizationInfoRequest $request): JsonResponse
    {
        $this->userService->updateOrganizationInfo(auth()->user(), $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function updateUserPhotos(Request $request)
    {
        $data = $request->validate([
            'user_ids' => 'required|array',
        ]);
        return response()->json($this->userService->updateUserPhotos(auth()->user(), $data));
    }
}
