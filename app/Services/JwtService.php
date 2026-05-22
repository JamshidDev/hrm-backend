<?php

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\User;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Str;

class JwtService
{
    private const REFRESH_TOKEN_LENGTH = 60;

    public static function generateAccessToken(User $user): string
    {
        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'iat' => time(),
            'exp' => time() + config('jwt.ttl', 900),
        ];

        return JWT::encode($payload, config('jwt.secret'), 'HS256');
    }

    public static function decode(string $token): object
    {
        return JWT::decode($token, new Key(config('jwt.secret'), 'HS256'));
    }

    public function issueRefreshToken(int $userId, string $deviceUuid, ?string $service): string
    {
        RefreshToken::query()->where('user_id', $userId)->delete();

        return $this->createRefreshToken($userId, $deviceUuid, $service);
    }

    public function rotateRefreshToken(string $refreshToken, ?string $deviceUuid, ?string $service): ?array
    {
        $token = RefreshToken::withTrashed()
            ->where('token', hash('sha256', $refreshToken))
            ->where('service_secret', $deviceUuid)
            ->where('service', $service)
            ->where('expires_at', '>', now())
            ->with('user')
            ->first();

        if (!$token || $token->deleted_at !== null) {
            if ($token) {
                RefreshToken::withTrashed()->where('user_id', $token->user_id)->delete();
            }
            return null;
        }

        $token->delete();

        $newRefresh = $this->createRefreshToken($token->user_id, $deviceUuid, $service);

        return [
            'user' => $token->user,
            'refresh_token' => $newRefresh,
        ];
    }

    public function revokeUserRefreshTokens(int $userId): void
    {
        RefreshToken::query()->where('user_id', $userId)->delete();
    }

    private function createRefreshToken(int $userId, ?string $deviceUuid, ?string $service): string
    {
        $plain = Str::random(self::REFRESH_TOKEN_LENGTH);

        RefreshToken::query()->create([
            'user_id' => $userId,
            'token' => hash('sha256', $plain),
            'service_secret' => $deviceUuid,
            'service' => $service,
            'expires_at' => Carbon::now()->addSeconds((int)config('jwt.refresh_ttl')),
        ]);

        return $plain;
    }
}
