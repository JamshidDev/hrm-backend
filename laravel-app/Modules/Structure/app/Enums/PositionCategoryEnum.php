<?php

namespace Modules\Structure\Enums;

enum PositionCategoryEnum: int
{
    case B = 1;
    case M = 2;
    case T = 3;
    case ICH = 4;
    case XK = 5;

    public function label(): string
    {
        return match ($this) {
            self::B => trans('messages.position_categories.b'),
            self::M => trans('messages.position_categories.m'),
            self::T => trans('messages.position_categories.t'),
            self::ICH => trans('messages.position_categories.ich'),
            self::XK => trans('messages.position_categories.xk'),
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

