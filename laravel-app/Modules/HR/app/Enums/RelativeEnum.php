<?php

namespace Modules\HR\Enums;

enum RelativeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;
    case NINE = 9;
    case TEN = 10;
    case ELEVEN = 11;
    case TWELVE = 12;
    case THIRTEEN = 13;
    case FOURTEEN = 14;
    case FIFTEEN = 15;

    public static function get(int $key, $locale = null): string
    {
        $locale = $locale ?: app()->getLocale();

        return self::all($locale)[$key] ?? "";
    }

    public static function all($locale): array
    {
        return array_combine(
            array_column(self::cases(), 'value'),
            array_map(static fn($case) => trans("messages.worker.family." . strtolower($case->name), [], $locale),
                self::cases())
        );
    }

    public static function list($locale): array
    {
        $locale = $locale ?: app()->getLocale();

        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all($locale)),
            self::all($locale)
        );
    }
}
