<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Structure\Models\Organization;
use Symfony\Component\HttpFoundation\Response;

class EconomistTelegramMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('Bot-Token') ?? $request->input('bot_token');

        if (!$token) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        $orgId = Organization::query()->where('bot_token', $token)->first()?->id;
        if (!$orgId) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        $request->merge([
            'organization_id' => $orgId,
        ]);
        return $next($request);
    }
}
