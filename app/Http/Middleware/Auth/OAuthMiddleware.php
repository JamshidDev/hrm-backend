<?php

namespace App\Http\Middleware\Auth;
use App\Models\OauthClient;
use Closure;
use Illuminate\Http\Request;

class OAuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $clientId = $request->client_id;
        $clientSecret = $request->client_secret;
        if (!$clientId || !$clientSecret) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        $client = OauthClient::query()
            ->where('client_id', $clientId)
            ->where('client_secret', $clientSecret)
            ->where('in_active', true)
            ->first();

        if (!$client) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        return $next($request);
    }

}