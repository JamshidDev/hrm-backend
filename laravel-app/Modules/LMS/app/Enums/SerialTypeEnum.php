<?php

namespace Modules\LMS\Enums;

enum SerialTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

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
            self::ONE => 'MO-RW',
            self::TWO => 'MO-LM',
            self::THREE => 'MO-SM'
        };
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

