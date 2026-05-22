<?php

namespace App\Services;

class MobileVersionService
{
    public static function compare(string $v1, string $v2): int
    {
        return version_compare($v1, $v2);
    }
}
