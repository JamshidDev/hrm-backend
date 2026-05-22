<?php

namespace Modules\Confirmation\Enums;

enum ApplicationEducationTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;

    public function label($locale): string
    {
        return trans(
            match ($this) {
                self::ONE => 'kechki',
                self::TWO => 'sirtqi',
            }
        );
    }

    public static function all(): array
    {
        return array_column(self::cases(), 'label', 'value');
    }

    public static function get(int $value, $locale): string
    {
        return self::tryFrom($value)?->label($locale) ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => ['id' => $case->value, 'name' => $case->label(app()->getLocale())],
            self::cases());
    }
}
