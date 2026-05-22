<?php

namespace App\Services\Mobile;

use App\Helpers\Helper;
use App\Models\LivenessSession;
use App\Models\User;
use App\Models\UserMobileKey;
use App\Services\JwtService;
use App\Services\UserService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Hash;

class MobileAuthService
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly UserService $userService,
    ) {
    }

    public function refresh(?string $refreshToken, ?string $deviceUuid, ?string $service): array
    {
        if (!$refreshToken) {
            throw new HttpResponseException(response()->json(['message' => 'No refresh token'], 401));
        }

        $rotated = $this->jwtService->rotateRefreshToken($refreshToken, $deviceUuid, $service);

        if (!$rotated) {
            throw new HttpResponseException(response()->json(['message' => 'Session expired'], 401));
        }

        return [
            'access_token' => JwtService::generateAccessToken($rotated['user']),
            'refresh_token' => $rotated['refresh_token'],
            'expires_in' => (int)config('jwt.ttl'),
        ];
    }

    public function login(array $data, ?string $deviceUuid, ?string $service): array
    {
        if (!$deviceUuid) {
            throw new HttpResponseException(Helper::response('UUID header is required', [], 400));
        }

        $user = User::query()
            ->withoutGlobalScope('hideAdmin')
            ->where('phone', $data['phone'])
            ->with('roles')
            ->first();

        if (!$user) {
            throw new HttpResponseException(
                Helper::response(trans('messages.invalid_credentials'), [], 401)
            );
        }

        $this->verifyCredentials($user, $data);

        $accessToken = JwtService::generateAccessToken($user);
        $refreshToken = $this->jwtService->issueRefreshToken($user->id, $deviceUuid, $service);

        $this->userService->authenticationLog($user, 'login');
        $this->userService->clearCacheUser($user);

        $this->upsertMobileKey($user->id, $deviceUuid, $data);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => (int)config('jwt.ttl'),
            'message' => trans('messages.auth.login_success'),
        ];
    }

    public function logout(User $user, string $deviceUuid): void
    {
        $this->userService->authenticationLog($user, 'logout');

        UserMobileKey::query()
            ->where('user_id', $user->id)
            ->where('device_uuid', $deviceUuid)
            ->delete();

        $this->jwtService->revokeUserRefreshTokens($user->id);
    }

    public function updateFcm(int $userId, ?string $deviceUuid, array $data): void
    {
        $query = UserMobileKey::query()
            ->where('user_id', $userId)
            ->where('device_uuid', $deviceUuid);

        if (empty($data['notification'])) {
            $query->update(['notifications' => false]);
            return;
        }

        $query->update([
            'fcm_token' => $data['fcm_token'] ?? null,
            'notifications' => true,
        ]);
    }

    private function verifyCredentials(User $user, array $data): void
    {
        $loginType = (string)($data['login_type'] ?? '');

        if ($loginType === 'password') {
            if (!Hash::check($data['password'] ?? '', $user->password)) {
                throw new HttpResponseException(
                    Helper::response(trans('messages.invalid_credentials_password'), [], 401)
                );
            }
            return;
        }

        if ($loginType === 'face') {
            $session = LivenessSession::query()
                ->where('session_id', $data['session_id'] ?? null)
                ->firstOrFail();

            if (!$session->success) {
                throw new HttpResponseException(
                    Helper::response(trans('messages.invalid_credentials'), [], 401)
                );
            }
        }
    }

    private function upsertMobileKey(int $userId, string $deviceUuid, array $data): void
    {
        $key = UserMobileKey::query()
            ->where('user_id', $userId)
            ->where('device_uuid', $deviceUuid)
            ->firstOrNew();

        $key->user_id = $userId;
        $key->device_uuid = $deviceUuid;
        $key->device_model = $data['device_model'] ?? null;
        $key->platform = $data['platform'] ?? null;
        $key->last_used_at = now();

        if (($data['login_type'] ?? null) === 'face') {
            $key->face = now();
        }

        $key->save();
    }
}
