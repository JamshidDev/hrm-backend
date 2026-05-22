<?php

namespace App\Http\Middleware;

use Closure;

class OnlyOfficeIPMiddleware
{
    public function handle($request, Closure $next)
    {
        if ($_SERVER['REMOTE_ADDR'] === '192.168.53.161' && $request->ip() === '213.130.125.172') {
            return $next($request);
        }
        abort(401);
    }
}
