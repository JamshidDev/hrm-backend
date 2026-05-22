<?php

namespace App\Http\Middleware\Auth;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LogViewerTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (config('app.env') === 'production') {
            $token = $request->cookie('log_viewer_token');
            if (!$token) {
                abort(403);
            }
            $key = 'log_viewer:' . hash('sha256', $token);
            if (!Cache::has($key)) {
                abort(403);
            }
            return $next($request);
        }
        return $next($request);
    }
}
