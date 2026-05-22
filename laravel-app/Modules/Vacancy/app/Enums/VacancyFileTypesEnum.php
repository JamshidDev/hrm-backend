<?php

namespace Modules\Vacancy\Enums;

enum VacancyFileTypesEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.vacancy.file_types.one'),
            self::TWO => trans('messages.vacancy.file_types.two'),
            self::THREE => trans('messages.vacancy.file_types.three'),
        };
    }

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.vacancy.file_types.one'),
            self::TWO->value => trans('messages.vacancy.file_types.two'),
            self::THREE->value => trans('messages.vacancy.file_types.three')
        ];
    }


    public static function get($key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($enum) => ['id' => $enum->value, 'name' => $enum->label()], self::cases());
    }
}
