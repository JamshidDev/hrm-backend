<?php

namespace Modules\HR\Enums;

enum BusinessTripEnum: int
{
    case ONE = 1;
    case TWO = 2;

    public static function get($key, $locale): string
    {
        $locale = $locale ?: app()->getLocale();

        return self::all($locale)[$key] ?? "";
    }

    public static function all($locale): array
    {
        return [
            self::ONE->value => __("Ish beruvchi o'zgarmagan holda", [], $locale),
            self::TWO->value => __("Boshqa ish beruvchiga", [], $locale)
        ];
    }

    public static function getTypeByCommand($key): string
    {
        return match ((int)$key) {
            CommandTypeEnum::SIXTY_ONE->value => self::TWO->value,
            CommandTypeEnum::SIXTY_TWO->value => self::ONE->value,
        };
    }

    public static function list(): array
    {
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all(app()->getLocale())),
            self::all(app()->getLocale())
        );
    }
}
