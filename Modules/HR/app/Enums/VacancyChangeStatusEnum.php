<?php

namespace Modules\HR\Enums;

enum VacancyChangeStatusEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.vacancy.changed.one'), //Ariza yaratildi
            self::TWO->value => trans('messages.vacancy.changed.two'), //Ariza qabul qilindi
            self::THREE->value => trans('messages.vacancy.changed.three'), //Ariza rad qilindi
            self::FOUR->value => trans('messages.vacancy.changed.four'), //Ariza yangi keyingi bosqichga yuborildi
            self::FIVE->value => trans('messages.vacancy.changed.five'), //Meet yaratildi
            self::SIX->value => trans('messages.vacancy.changed.six'), //Meet boshlandi
            self::SEVEN->value => trans('messages.vacancy.changed.seven'), //Meet tugatildi
            self::EIGHT->value => trans('messages.vacancy.changed.eight'), //Ariza to'liq tugatildi
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
