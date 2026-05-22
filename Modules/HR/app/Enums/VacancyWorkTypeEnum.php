<?php

namespace Modules\HR\Enums;

enum VacancyWorkTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;

    public static function all(): array
    {
        return [
            self::TWO->value => trans('messages.worker.political_party.two'),
            self::THREE->value => trans('messages.worker.political_party.three'),
            self::FOUR->value => trans('messages.worker.political_party.four'),
            self::FIVE->value => trans('messages.worker.political_party.five'),
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
