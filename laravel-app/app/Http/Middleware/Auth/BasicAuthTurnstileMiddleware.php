<?php

namespace App\Http\Middleware\Auth;

use Closure;
use Illuminate\Http\Request;

class BasicAuthTurnstileMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (config('app.env') === 'production') {
            $AUTH_USER = config('auth.hcp.username');
            $AUTH_PASS = config('auth.hcp.password');

            header('Cache-Control: no-cache, must-revalidate, max-age=0');
            $has_supplied_credentials = !(empty($_SERVER['PHP_AUTH_USER']) && empty($_SERVER['PHP_AUTH_PW']));

            $is_not_authenticated = (!$has_supplied_credentials || $_SERVER['PHP_AUTH_USER'] !== $AUTH_USER || $_SERVER['PHP_AUTH_PW'] !== $AUTH_PASS);

            if ($is_not_authenticated) {
                header('HTTP/1.1 401 Authorization Required');
                header('WWW-Authenticate: Basic realm="Access denied"');
                abort(401, trans('Access denied'));
            }
        }
        return $next($request);
    }
}
