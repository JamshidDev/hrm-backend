<?php

namespace Modules\HR\Enums;

enum VacationAdditionalEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;

    public static function all($locale = 'uz'): array
    {
        return [
            self::ONE->value => trans('messages.vacations.additional_types.one', [], $locale),
            self::TWO->value => trans('messages.vacations.additional_types.two', [], $locale),
            self::THREE->value => trans('messages.vacations.additional_types.three', [], $locale),
            self::FOUR->value => trans('messages.vacations.additional_types.four', [], $locale),
            self::FIVE->value => trans('messages.vacations.additional_types.five', [], $locale),
            self::SIX->value => trans('messages.vacations.additional_types.six', [], $locale),
        ];
    }

    public static function get(int $key, $locale = 'uz'): string
    {
        return self::all($locale)[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all()),
            self::all()
        );
    }
}
