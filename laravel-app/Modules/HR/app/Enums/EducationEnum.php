<?php

namespace Modules\HR\Enums;

enum EducationEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.education.level.one'),
            self::TWO->value => trans('messages.education.level.two'),
            self::THREE->value => trans('messages.education.level.three'),
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
