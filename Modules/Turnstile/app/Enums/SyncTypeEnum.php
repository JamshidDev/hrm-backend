<?php

namespace Modules\Turnstile\Enums;

enum SyncTypeEnum: int
{

    case ONE = 1;
    case TWO = 2;

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
            self::ONE => trans('messages.turnstile.sync_type.one'),
            self::TWO => trans('messages.turnstile.sync_type.two')
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
