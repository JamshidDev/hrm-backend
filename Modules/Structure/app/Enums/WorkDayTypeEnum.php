<?php

namespace Modules\Structure\Enums;

enum WorkDayTypeEnum: int
{
    case D = 1;
    case N = 2;

    public function label(): string
    {
        return match ($this) {
            self::D => trans('messages.work_day.types.d'),
            self::N => trans('messages.work_day.types.n'),
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
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}

