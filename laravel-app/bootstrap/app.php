<?php

use App\Exceptions\BusinessException;
use App\Helpers\Helper;
use App\Http\Middleware\Auth\AuthHybridMiddleware;
use App\Http\Middleware\Auth\BasicAuthMiddleware;
use App\Http\Middleware\Auth\BasicAuthTurnstileMiddleware;
use App\Http\Middleware\Auth\JwtMiddleware;
use App\Http\Middleware\Auth\LogViewerTokenMiddleware;
use App\Http\Middleware\Auth\OAuthMiddleware;
use App\Http\Middleware\Auth\TelegramMiddleware;
use App\Http\Middleware\Auth\TelegramUserMiddleware;
use App\Http\Middleware\EconomistTelegramMiddleware;
use App\Http\Middleware\HmacAuthMiddleware;
use App\Http\Middleware\LogIntegrationApi;
use App\Http\Middleware\OnlyOfficeIPMiddleware;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SocketServerApiKeyMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))->withRouting(
    web: __DIR__ . '/../routes/web.php',
    api: __DIR__ . '/../routes/api.php',
    commands: __DIR__ . '/../routes/console.php',
    health: '/up',
)->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => RoleMiddleware::class,
        'permission' => PermissionMiddleware::class,
        'role_or_permission' => RoleOrPermissionMiddleware::class,
        'only_office_ip' => OnlyOfficeIPMiddleware::class,
        'telegram' => TelegramMiddleware::class,
        'telegram-user' => TelegramUserMiddleware::class,
        'basic-auth' => BasicAuthMiddleware::class,
        'log.viewer.token' => LogViewerTokenMiddleware::class,
        'basic-auth-turnstile' => BasicAuthTurnstileMiddleware::class,
        'economist-bot-token' => EconomistTelegramMiddleware::class,
        'socket-server-api' => SocketServerApiKeyMiddleware::class,
        'hmac.auth' => HmacAuthMiddleware::class,
        'oauth.sign' => OAuthMiddleware::class,
        'jwt' => JwtMiddleware::class,
        'auth.hybrid' => AuthHybridMiddleware::class,
        'integration.log' => LogIntegrationApi::class,
    ]);
    $middleware->trustProxies(at: [
        '192.168.53.161'
    ]);
    $middleware->appendToGroup('api', SetLocale::class);

    $middleware->encryptCookies(except: [
        'log_viewer_token',
    ]);
})->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (BusinessException $e) {
        return Helper::response($e->getMessage(), $e->getData(), $e->getStatus());
    });
    $exceptions->dontReport([
        BusinessException::class,
    ]);
    $exceptions->render(function (AuthenticationException $e, $request) {
        return response()->json([
            'message' => 'Unauthenticated'
        ], 401);
    });
})->create();
