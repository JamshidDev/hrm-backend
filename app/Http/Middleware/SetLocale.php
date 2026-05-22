<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('Accept-Language', 'uz');

        if (in_array($locale, ['en', 'uz', 'ru'])) {
            App::setLocale($locale);
        } else {
            App::setLocale('uz');
        }

        return $next($request);
    }
}
