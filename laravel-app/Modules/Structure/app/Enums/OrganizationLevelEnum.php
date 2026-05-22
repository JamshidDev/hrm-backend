<?php

namespace Modules\Structure\Enums;

enum OrganizationLevelEnum: int
{
    case DEPARTMENT = 1;
    case MANAGEMENT = 2;
    case COMPANY = 3;
    case ORGANIZATION = 4;

    public function label(): string
    {
        return match ($this) {
            self::DEPARTMENT => __("Departament"),
            self::MANAGEMENT => __("Boshqarma"),
            self::COMPANY => __("Kompaniya"),
            self::ORGANIZATION => __("Korxona"),
        };
    }

    public static function all(): array
    {
        return array_combine(
            array_map(fn($case) => $case->value, self::cases()),
            array_map(fn($case) => $case->label(), self::cases())
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
