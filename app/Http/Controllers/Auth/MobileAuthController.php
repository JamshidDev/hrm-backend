<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\Auth\MobileLoginRequest;
use App\Http\Requests\Mobile\Auth\MobileLogoutRequest;
use App\Http\Requests\Mobile\Auth\MobileRefreshRequest;
use App\Http\Requests\Mobile\Auth\MobileUpdateFcmRequest;
use App\Services\Mobile\MobileAuthService;
use Illuminate\Http\JsonResponse;

class MobileAuthController extends Controller
{
    public function __construct(private readonly MobileAuthService $service)
    {
    }

    public function refresh(MobileRefreshRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->refresh(
                $request->input('refresh_token'),
                $request->header('X-Device-UUID'),
                $request->header('X-Auth-Type'),
            )
        );
    }

    public function login(MobileLoginRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->login(
                $request->validated(),
                $request->header('X-Device-UUID'),
                $request->header('X-AUTH-TYPE'),
            )
        );
    }

    public function logout(MobileLogoutRequest $request): JsonResponse
    {
        $this->service->logout(auth()->user(), $request->validated('device_uuid'));

        return Helper::response(trans('messages.auth.logout_success'));
    }

    public function updateFCM(MobileUpdateFcmRequest $request): JsonResponse
    {
        $this->service->updateFcm(
            auth()->id(),
            $request->header('X-Device-UUID'),
            $request->validated(),
        );

        return Helper::response(trans('messages.successfully_updated'));
    }
}
