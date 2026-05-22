<?php

namespace App\Http\Middleware\Auth;

use Closure;
use Illuminate\Http\Request;

class BasicAuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (config('app.env') === 'production') {
            $AUTH_USER = config('auth.basic.username');
            $AUTH_PASS = config('auth.basic.password');

            header('Cache-Control: no-cache, must-revalidate, max-age=0');
            $has_supplied_credentials = !(empty($_SERVER['PHP_AUTH_USER']) && empty($_SERVER['PHP_AUTH_PW']));

            $is_not_authenticated = (!$has_supplied_credentials || $_SERVER['PHP_AUTH_USER'] !== $AUTH_USER || $_SERVER['PHP_AUTH_PW'] !== $AUTH_PASS);

            if ($is_not_authenticated) {
                return response('Unauthorized', 401, [
                    'WWW-Authenticate' => 'Basic realm="Access denied"',
                    'Cache-Control' => 'no-cache, must-revalidate, max-age=0',
                ]);
            }
        }
        return $next($request);
    }
}
