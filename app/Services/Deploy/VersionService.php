<?php

namespace App\Services\Deploy;

use App\Models\DeployLog;

class VersionService
{
    private const string INITIAL_VERSION = '1.0.0';
    private const int PATCH_MAX = 9;
    private const int MINOR_MAX = 9;

    public function nextVersion(): string
    {
        $lastLog = DeployLog::query()
            ->orderByDesc('version')
            ->first();

        if (!$lastLog) {
            return self::INITIAL_VERSION;
        }

        return $this->bump($lastLog->version) ?? self::INITIAL_VERSION;
    }

    private function bump(string $version): ?string
    {
        $parts = explode('.', $version);

        if (count($parts) !== 3) {
            return null;
        }

        [$major, $minor, $patch] = array_map('intval', $parts);

        if ($patch >= self::PATCH_MAX) {
            $patch = 0;
            $minor++;
        } else {
            $patch++;
        }

        if ($minor > self::MINOR_MAX) {
            $minor = 0;
            $major++;
        }

        return "{$major}.{$minor}.{$patch}";
    }
}
