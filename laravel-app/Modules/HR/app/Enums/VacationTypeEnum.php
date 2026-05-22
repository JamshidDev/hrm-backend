<?php

namespace Modules\HR\Enums;

enum VacationTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;

    public static function all($locale): array
    {
        return [
            self::ONE->value   => trans('messages.vacations.types.one', [], $locale),
            self::TWO->value   => trans('messages.vacations.types.two', [], $locale),
            self::THREE->value => trans('messages.vacations.types.three', [], $locale),
            self::FOUR->value  => trans('messages.vacations.types.four', [], $locale),
            self::FIVE->value  => trans('messages.vacations.types.five', [], $locale),
            self::SIX->value   => trans('messages.vacations.types.six', [], $locale),
            self::SEVEN->value => trans('messages.vacations.types.seven', [], $locale),
            self::EIGHT->value => trans('messages.vacations.types.eight', [], $locale),
        ];
    }

    public static function get($key, $locale): string
    {
        $vKey = match ($key) {
            CommandTypeEnum::FORTY_ONE->value,
            CommandTypeEnum::FORTY_TWO->value,
            CommandTypeEnum::FORTY_THREE->value,
            CommandTypeEnum::FORTY_FOUR->value,
            CommandTypeEnum::FORTY_SIX->value => self::ONE->value,
            CommandTypeEnum::FORTY_FIVE->value,
            CommandTypeEnum::FORTY_NINE->value => self::THREE->value,
            CommandTypeEnum::FORTY_EIGHT->value => self::TWO->value,
            CommandTypeEnum::FIFTY_ONE->value => self::FIVE->value,
            CommandTypeEnum::FIFTY_TWO->value => self::FOUR->value,
            CommandTypeEnum::FIFTY_THREE->value => self::SEVEN->value,
            CommandTypeEnum::FIFTY_FIVE->value => self::SIX->value,
            default => self::EIGHT->value
        };
        $locale = $locale ?: app()->getLocale();
        return self::all($locale)[$vKey] ?? "";
    }

    public static function getVacationKey($key): array
    {
        return match ($key) {
            self::ONE->value => [
                CommandTypeEnum::FORTY_ONE->value,
                CommandTypeEnum::FORTY_TWO->value,
                CommandTypeEnum::FORTY_THREE->value,
                CommandTypeEnum::FORTY_FOUR->value,
                CommandTypeEnum::FORTY_SIX->value
            ],
            self::THREE->value => [
                CommandTypeEnum::FORTY_FIVE->value,
                CommandTypeEnum::FORTY_NINE->value,
            ],
            self::FOUR->value => [
                CommandTypeEnum::FIFTY_TWO->value,
            ],
            self::FIVE->value => [
                CommandTypeEnum::FIFTY_ONE->value,
            ],
            self::TWO->value => [
                CommandTypeEnum::FORTY_EIGHT->value,
            ],
            self::SEVEN->value => [
                CommandTypeEnum::FIFTY_THREE->value,
            ],
            self::SIX->value => [
                CommandTypeEnum::FIFTY_FIVE->value,
            ],
            self::EIGHT->value => [
                CommandTypeEnum::FORTY_ONE->value,
                CommandTypeEnum::FORTY_TWO->value,
                CommandTypeEnum::FORTY_THREE->value,
                CommandTypeEnum::FORTY_FOUR->value,
                CommandTypeEnum::FORTY_FIVE->value,
                CommandTypeEnum::FORTY_SIX->value,
                CommandTypeEnum::FORTY_SEVEN->value,
                CommandTypeEnum::FORTY_NINE->value,
                CommandTypeEnum::FIFTY_ONE->value,
                CommandTypeEnum::FIFTY_TWO->value,
                CommandTypeEnum::FIFTY_THREE->value,
                CommandTypeEnum::FIFTY_FIVE->value,
                CommandTypeEnum::FORTY_EIGHT->value
            ]
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
