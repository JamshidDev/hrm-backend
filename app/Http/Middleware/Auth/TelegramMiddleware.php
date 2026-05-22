<?php

namespace App\Http\Middleware\Auth;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TelegramMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('Bot-Token') ?? $request->input('bot_token');

        if (!$token || $token !== config('services.telegram.bot_token')) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
