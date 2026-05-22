<?php

namespace App\Services;

use App\Models\OtpService;
use Exception;

class TranslateService
{
    protected static array $mapping = [
        "ch" => "ч",
        "sh" => "ш",
        "ya" => "я",
        "yu" => "ю",
        "yo" => "ё",
        "o'" => "ў",
        "g'" => "ғ",
        "a"  => "а",
        "b"  => "б",
        "d"  => "д",
        "e"  => "э",
        "f"  => "ф",
    ];

    public static function latinToCyrillic($text)
    {
        foreach (self::$mapping as $lat => $cyr) {
            $text = str_replace($lat, $cyr, $text);
        }
        return $text;
    }
}
