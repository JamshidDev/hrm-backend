<?php

namespace Modules\Structure\Enums;

enum HolidayTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.holidays.types.one'),
            self::TWO => trans('messages.holidays.types.two'),
        };
    }

    public static function all(): array
    {
        return array_combine(
            array_map(static fn($case) => $case->value, self::cases()),
            array_map(static fn($case) => $case->label(), self::cases())
        );
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}
