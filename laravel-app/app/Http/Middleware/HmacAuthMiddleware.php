<?php

namespace App\Http\Middleware;

use App\Models\HmacUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class HmacAuthMiddleware
{
    private const string HEADER_PUBLIC_KEY = 'X-PUBLIC-KEY';
    private const string HEADER_SIGNATURE = 'X-SIGNATURE';
    private const string HEADER_TIMESTAMP = 'X-TIMESTAMP';
    private const string HEADER_SECRET_TYPE = 'X-SECRET-TYPE';
    private const string HEADER_NONCE = 'X-NONCE';
    private const string HEADER_VERSION = 'X-HMAC-VERSION';

    public function handle(Request $request, Closure $next): Response
    {
        $headers = $this->extractHeaders($request);
        $version = $this->resolveVersion($headers['version']);

        if (!$this->hasRequiredHeaders($headers, $version)) {
            return $this->unauthorizedResponse('Missing authentication headers.');
        }

        if (!$this->isValidTimestamp($headers['timestamp'])) {
            return $this->unauthorizedResponse('Invalid or expired timestamp.');
        }

        if (!$this->isValidSignature($headers['signature'])) {
            return $this->unauthorizedResponse('Invalid signature format.');
        }

        $user = HmacUser::query()
            ->where('public_key', $headers['public_key'])
            ->where('secret_type', $headers['secret_type'])
            ->where('is_active', true)
            ->first();

        if (!$user || !$user->secret_key) {
            return $this->unauthorizedResponse();
        }

        if (!$this->signatureMatches($request, $headers, $user->secret_key, $version)) {
            return $this->unauthorizedResponse();
        }

        if ($version === 'v2' && !$this->rememberNonce($headers['public_key'], $headers['secret_type'], $headers['nonce'])) {
            return $this->unauthorizedResponse('Replay attack detected.');
        }

        $request->attributes->set('hmac_user', $user);
        $request->attributes->set('hmac_public_key', $headers['public_key']);
        $request->attributes->set('hmac_secret_type', $headers['secret_type']);
        $request->attributes->set('hmac_version', $version);

        return $next($request);
    }

    private function extractHeaders(Request $request): array
    {
        return [
            'public_key' => trim((string) $request->header(self::HEADER_PUBLIC_KEY)),
            'signature' => strtolower(trim((string) $request->header(self::HEADER_SIGNATURE))),
            'timestamp' => trim((string) $request->header(self::HEADER_TIMESTAMP)),
            'secret_type' => Str::lower(trim((string) $request->header(self::HEADER_SECRET_TYPE))),
            'nonce' => trim((string) $request->header(self::HEADER_NONCE)),
            'version' => Str::lower(trim((string) $request->header(self::HEADER_VERSION))),
        ];
    }

    private function hasRequiredHeaders(array $headers, string $version): bool
    {
        if (
            $headers['public_key'] === ''
            || $headers['signature'] === ''
            || $headers['timestamp'] === ''
            || $headers['secret_type'] === ''
        ) {
            return false;
        }

        if ($version !== 'v2' || !config('hmac.require_nonce', false)) {
            return true;
        }

        return $headers['nonce'] !== '' && preg_match('/^[A-Za-z0-9_-]{16,128}$/', $headers['nonce']) === 1;
    }

    private function isValidTimestamp(string $timestamp): bool
    {
        if (!preg_match('/^\d{10}$/', $timestamp)) {
            return false;
        }

        return abs(time() - (int) $timestamp) <= (int) config('hmac.max_clock_skew_seconds', 60);
    }

    private function isValidSignature(string $signature): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $signature) === 1;
    }

    private function signatureMatches(Request $request, array $headers, string $secretKey, string $version): bool
    {
        $payloads = match ($version) {
            'v1' => [$this->buildLegacyPayload($request, $headers)],
            'v2' => [$this->buildSignaturePayload($request, $headers)],
            default => [],
        };

        if (
            $version === 'v2'
            && config('hmac.allow_legacy_fallback', true)
            && $headers['version'] === ''
        ) {
            $payloads[] = $this->buildLegacyPayload($request, $headers);
        }

        foreach ($payloads as $payload) {
            $computedSignature = hash_hmac('sha256', $payload, $secretKey);

            if (hash_equals($computedSignature, $headers['signature'])) {
                return true;
            }
        }

        return false;
    }

    private function buildLegacyPayload(Request $request, array $headers): string
    {
        return $headers['timestamp'] . ($request->getContent() ?: '');
    }

    private function buildSignaturePayload(Request $request, array $headers): string
    {
        $query = $request->query();
        ksort($query);

        return implode("\n", [
            $headers['timestamp'],
            $headers['nonce'],
            strtoupper($request->method()),
            '/' . ltrim($request->path(), '/'),
            http_build_query($query, '', '&', PHP_QUERY_RFC3986),
            hash('sha256', $request->getContent() ?: ''),
            $headers['public_key'],
            $headers['secret_type'],
        ]);
    }

    private function resolveVersion(string $version): string
    {
        $resolved = $version !== '' ? $version : Str::lower((string) config('hmac.default_version', 'v1'));

        return in_array($resolved, ['v1', 'v2'], true) ? $resolved : 'v1';
    }

    private function rememberNonce(string $publicKey, string $secretType, string $nonce): bool
    {
        if ($nonce === '') {
            return true;
        }

        return Cache::add(
            $this->nonceCacheKey($publicKey, $secretType, $nonce),
            true,
            now()->addSeconds((int) config('hmac.nonce_ttl_seconds', 120))
        );
    }

    private function nonceCacheKey(string $publicKey, string $secretType, string $nonce): string
    {
        return 'hmac_nonce:' . hash('sha256', $publicKey . '|' . $secretType . '|' . $nonce);
    }

    private function unauthorizedResponse(string $message = 'Unauthorized.'): Response
    {
        return response()->json([
            'message' => $message,
            'error' => true,
        ], 401);
    }
}
