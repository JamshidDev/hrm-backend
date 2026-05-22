<?php

namespace Modules\Turnstile\Enums;

enum HCPErrorCodesEnum: int
{
    case ONE = 4;
    case TWO = 943;
    case THREE = 4294967306;
    case FOUR = 0;
    case FIVE = 4033;

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
            self::ONE => trans('messages.turnstile.hcp_error_codes.one'),
            self::TWO => trans('messages.turnstile.hcp_error_codes.two'),
            self::THREE => trans('messages.turnstile.hcp_error_codes.three'),
            self::FOUR => trans('messages.turnstile.hcp_error_codes.four'),
            self::FIVE => trans('messages.turnstile.hcp_error_codes.five'),
        };
    }

    public static function get($key): string
    {
        return self::tryFrom($key)?->label() ?? $key;
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }

}
