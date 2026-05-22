<?php

namespace App\Http\Middleware\Auth;

use Closure;
use Illuminate\Http\Request;

class AuthHybridMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $authType = strtolower($request->header('X-Auth-Type', ''));
        return match ($authType) {
            'sanctum' => $this->handleSanctum($request, $next),
            'mobile' => $this->handleJwt($request, $next),
            default   => response()->json(['message' => trans('messages.auth.invalid_auth_type')], 401),
        };
    }

    protected function handleSanctum(Request $request, Closure $next)
    {
        if (!auth('sanctum')->check()) {
            return response()->json(['message' => trans('messages.auth.unauthenticated_sanctum')], 401);
        }
        return $next($request);
    }

    protected function handleJwt(Request $request, Closure $next)
    {
        if (!$request->hasHeader('Authorization')) {
            return response()->json(['message' => trans('messages.auth.unauthenticated_jwt')], 401);
        }
        return app(JwtMiddleware::class)->handle($request, $next);
    }
}
