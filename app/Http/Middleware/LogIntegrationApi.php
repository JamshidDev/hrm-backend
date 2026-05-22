<?php

namespace App\Http\Middleware;

use App\Models\HmacUser;
use App\Models\IntegrationApiLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Log;
use Throwable;

class LogIntegrationApi
{
    public function handle(Request $request, Closure $next)
    {
        $start = microtime(true);

        $response = $next($request);

        if (!str_starts_with($request->path(), 'api/v1/integration')) {
            return $response;
        }

        $secret = $request->header('X-PUBLIC-KEY');
        if ($secret) {
            $user = $request->attributes->get('hmac_user');
            $userId = $user->id ?? null;
            if (!$user || !$user->is_active) {
                abort(401);
            }
            $apiType = 'hmac';
            $model = HmacUser::class;
        } else {
            $user = $request->user();

            $hmacUser = $this->getCachedHmacUser($user->phone);
            if (!$hmacUser || !$hmacUser->is_active) {
                abort(401);
            }
            $userId = $user->id;
            $secret = $user->phone;
            $apiType = 'sanctum';
            $model = User::class;
        }

        try {
            $data = [
                'model_id' => $userId,
                'model_type' => $model,
                'secret' => $secret,
                'api_type' => $apiType,

                'endpoint' => $request->path(),
                'method' => $request->method(),

                'request_headers' => $this->filterHeaders($request->headers->all()),
                'request_body' => $this->filterRequest($request->all()),

                'response_status' => $response->getStatusCode(),
                'response_body' => $this->getResponseBody($response),

                'duration_ms' => (int)((microtime(true) - $start) * 1000),
            ];
            IntegrationApiLog::create($data);
        } catch (Throwable $e) {
            Log::error($e);
        }

        return $response;
    }

    private function getCachedHmacUser($phone)
    {
        return Cache::remember(
            'hmac_user_sanctum_' . $phone,
            now()->addHours(2),
            fn() => HmacUser::where('public_key', $phone)
                ->where('secret_type', 'sanctum_user')
                ->first()
        );
    }

    private function getResponseBody($response)
    {
        $content = $response->getContent();
        return strlen($content) > 2000
            ? substr($content, 0, 2000)
            : json_decode($content, true);
    }

    private function filterRequest($data)
    {
        unset($data['password'], $data['token']);
        return $data;
    }

    private function filterHeaders($headers)
    {
        unset($headers['authorization']);
        return $headers;
    }
}
