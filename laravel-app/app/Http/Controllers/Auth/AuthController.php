<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(protected UserService $userService)
    {
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|digits:9',
            'password' => 'required|min:8'
        ]);

        $ip = $request->ip();

        $key = 'login:' . $data['phone'] . '|' . $ip;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return Helper::response(trans('messages.errors.too_many_attempts_try_again_later'), [], 429);
        }

        $user = User::query()
            ->withoutGlobalScope('hideAdmin')
            ->where('phone', $data['phone'])
            ->with('roles')
            ->first();

        $passwordValid = Hash::check(
            $data['password'],
            $user?->password ?? bcrypt('fake_password')
        );

        if (
            !$user ||
            !$passwordValid ||
            !$user->worker_id
        ) {
            RateLimiter::hit($key, 60);
            return Helper::response(trans('messages.invalid_credentials'), [], 401);
        }

        if (!Helper::userRoleAndPermissions($user->roles, $user->organization_id)) {
            return Helper::response(trans('messages.invalid_credentials'), [], 401);
        }

        if (!$user->status) {
            return Helper::response(trans('messages.user_block'), [], 400);
        }

        $mustChange = !$user->password_changed_at ||
            abs(now()->diffInDays($user->password_changed_at)) > 30;

        RateLimiter::clear($key);

        if (app()->isProduction() && !($user->hasPermissionTo('integration') ?? false)){
            $user->tokens()->delete();
        }

        $token = $user->createToken('sanctum')->plainTextToken;

        $this->userService->authenticationLog($user, 'login');
        $this->userService->clearCacheUser($user);

        return response()->json([
            'access_token' => $token,
            'message' => trans('messages.auth.login_success'),
            'must_change' => $mustChange
        ]);
    }

    public function logout(): JsonResponse
    {
        $user = auth()->user();
        $this->userService->authenticationLog($user, 'logout');
        $user->currentAccessToken()->delete();

        return Helper::response(trans('messages.auth.logout_success'));
    }

    public function generateLogViewerToken()
    {
        $token = Str::random(64);
        Cache::put(
            'log_viewer:' . hash('sha256', $token),
            true,
            now()->addHours(2)
        );

        return response()->json([
            'url' => url('/log-viewer')
        ])->cookie(
            'log_viewer_token',
            $token,
            120,
            '/',
            'hrm-api.railway.uz',
            true,
            true,
            false,
            'None'
        );
    }

}
