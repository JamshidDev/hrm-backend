<?php

namespace Modules\Exam\Enums;

enum ResultDownloadTypeEnum: int
{

    case ONE = 1;

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
            self::ONE => trans('Imtihon natijasi'),
        };
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id'   => $case->value,
            'name' => $case->label()
        ], self::cases());
    }

}
