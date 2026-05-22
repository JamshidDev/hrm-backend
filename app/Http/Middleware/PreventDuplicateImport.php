<?php

namespace App\Http\Middleware;

use Illuminate\Support\Facades\Cache;

class PreventDuplicateImport
{
    protected string $lockKey;

    public function __construct(string $lockKey)
    {
        $this->lockKey = $lockKey;
    }

    public function handle($job, $next)
    {
        $lockKey = $this->lockKey;

        if (Cache::has($lockKey)) {
            return $job->delete();
        }
        Cache::put($lockKey, true, now()->addMinutes(60));
        try {
            return $next($job);
        } finally {
            Cache::forget($lockKey);
        }
    }
}
