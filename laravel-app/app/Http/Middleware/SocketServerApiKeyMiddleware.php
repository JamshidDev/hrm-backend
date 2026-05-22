<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SocketServerApiKeyMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $clientSecret = $request->header('X-SOCKET-SECRET');

        if (!$clientSecret) {
            return response()->json([], 401);
        }

        if (!hash_equals(config('services.socket.secret'), (string)$clientSecret)) {
            return response()->json([], 401);
        }

        return $next($request);
    }

}
