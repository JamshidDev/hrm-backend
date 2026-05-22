<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;

class Handler extends ExceptionHandler
{
    public function register(): void
    {
        //
    }

    protected function unauthenticated($request, AuthenticationException $exception): Response|JsonResponse|RedirectResponse
    {
        return response()->json([
            'message' => 'Unauthenticated',
            'error' => true,
            'data' => []
        ], 401);
    }

    protected function redirectTo($request)
    {
        if (!$request->expectsJson()) {
            return null;
        }
    }
}
