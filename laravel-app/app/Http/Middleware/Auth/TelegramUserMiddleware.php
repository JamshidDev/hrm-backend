<?php

namespace App\Http\Middleware\Auth;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TelegramUserMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('Uuid') ?? $request->input('Uuid');

        $user = User::query()
            ->withCount('hcp_devices')
            ->whereUuid($uuid)
            ->with('worker')
            ->first();

        if (!$uuid ||
            !$user ||
            !$user->worker_id) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
