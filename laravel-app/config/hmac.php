<?php

return [
    'max_clock_skew_seconds' => (int) env('HMAC_MAX_CLOCK_SKEW_SECONDS', 60),
    'nonce_ttl_seconds' => (int) env('HMAC_NONCE_TTL_SECONDS', 120),
    'require_nonce' => filter_var(env('HMAC_REQUIRE_NONCE', false), FILTER_VALIDATE_BOOL),
    'default_version' => env('HMAC_DEFAULT_VERSION', 'v1'),
    'allow_legacy_fallback' => filter_var(env('HMAC_ALLOW_LEGACY_FALLBACK', true), FILTER_VALIDATE_BOOL),
];
