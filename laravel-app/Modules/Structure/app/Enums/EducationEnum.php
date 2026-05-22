<?php

namespace Modules\Structure\Enums;

enum EducationEnum: int
{
    case HIGH = 1;
    case MEDIUM_SPECIAL = 2;
    case MEDIUM = 3;

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
            self::HIGH => trans('messages.education.level.one'),
            self::MEDIUM_SPECIAL => trans('messages.education.level.two'),
            self::MEDIUM => trans('messages.education.level.three'),
        };
    }

    public static function get($key): string
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
