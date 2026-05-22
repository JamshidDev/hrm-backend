<?php

namespace Modules\HR\Enums;

enum AcademicTitleEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.academic.title.associate_professor'),
            self::TWO->value => trans('messages.academic.title.professor'),
            self::THREE->value => trans('messages.academic.title.senior_researcher'),
            self::FOUR->value => trans('messages.academic.title.academic'),
        ];
    }

    public static function get($key): string
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
