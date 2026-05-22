<?php

namespace Modules\HR\Enums;

enum GiftTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;

    public static function get(int $key, $locale): string
    {
        $locale = $locale ?: app()->getLocale();
        return self::all($locale)[$key] ?? "";
    }

    public static function all($locale): array
    {
        return [
            self::ONE->value   => trans('messages.incentives.gift_type.one', [], $locale),
            self::TWO->value   => trans('messages.incentives.gift_type.two', [], $locale),
            self::THREE->value => trans('messages.incentives.gift_type.three', [], $locale),
            self::FOUR->value  => trans('messages.incentives.gift_type.four', [], $locale),
            self::FIVE->value  => trans('messages.incentives.gift_type.five', [], $locale),
        ];
    }

    public static function list(): array
    {
        $locale = app()->getLocale();
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all($locale)),
            self::all($locale)
        );
    }
}
