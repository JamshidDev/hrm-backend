<?php

namespace App\Http\Middleware\Auth;
use App\Models\User;
use App\Services\JwtService;
use Closure;
use Exception;

class JwtMiddleware
{
    public function handle($request, Closure $next)
    {
        $header = $request->header('Authorization');

        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => trans('messages.token_not_provided')], 401);
        }

        $token = substr($header, 7);

        try {
            $payload = JwtService::decode($token);
        } catch (Exception $e) {
            return response()->json(['message' => trans('messages.token_invalid_or_expired')], 401);
        }

        $user = User::find($payload->sub);

        if (!$user) {
            return response()->json(['message' => trans('messages.user_not_found')], 401);
        }

        auth()->setUser($user);
        return $next($request);
    }
}
