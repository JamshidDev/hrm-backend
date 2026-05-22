<?php

namespace Modules\HR\Enums;

enum DepartmentCategoryEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.department_position.staff_category.AUR'),
            self::TWO->value => trans('messages.department_position.staff_category.UP'),
            self::THREE->value => trans('messages.department_position.staff_category.ITR'),
            self::FOUR->value => trans('messages.department_position.staff_category.PP'),
            self::FIVE->value => trans('messages.department_position.staff_category.OP'),
        ];
    }

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(
            fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all()),
            self::all()
        );
    }
}
