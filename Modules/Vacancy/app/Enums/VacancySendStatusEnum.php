<?php

namespace Modules\Vacancy\Enums;

enum VacancySendStatusEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.vacancy.user.statues.one'),
            self::TWO => trans('messages.vacancy.user.statues.two'),
            self::THREE => trans('messages.vacancy.user.statues.three'),
        };
    }

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.vacancy.user.statues.one'),
            self::TWO->value => trans('messages.vacancy.user.statues.two'),
            self::THREE->value => trans('messages.vacancy.user.statues.three')
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
