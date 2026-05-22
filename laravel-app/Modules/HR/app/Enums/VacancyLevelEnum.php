<?php

namespace Modules\HR\Enums;

enum VacancyLevelEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.vacancy.levels.one'), //Ariza topshirish etapi
            self::TWO->value => trans('messages.vacancy.levels.two'), //Hujjatlarni baholash
            self::THREE->value => trans('messages.vacancy.levels.three'), //Suhbat
            self::FOUR->value => trans('messages.vacancy.levels.four'), //Tibbiy ko'rik
            self::FIVE->value => trans('messages.vacancy.levels.five'), //Onlayn test
            self::SIX->value => trans('messages.vacancy.levels.six'), //Ariza Yakunlash
            self::SEVEN->value => trans('messages.vacancy.levels.seven'), //Ariza Yakunlash
        ];
    }

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all()),
            self::all()
        );
    }
}
