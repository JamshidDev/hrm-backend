<?php

namespace Modules\Turnstile\Enums;

enum ScheduleTypeEnum: int
{

    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;

    public static function all(): array
    {
        return array_combine(
            array_map(static fn($case) => $case->value, self::cases()),
            array_map(static fn($case) => $case->label(), self::cases())
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.turnstile.schedules.types.one'),
            self::TWO => trans('messages.turnstile.schedules.types.two'),
            self::THREE => trans('messages.turnstile.schedules.types.three'),
            self::FOUR => trans('messages.turnstile.schedules.types.four'),
            self::FIVE => trans('messages.turnstile.schedules.types.five')
        };
    }

    public static function get($key): string
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
