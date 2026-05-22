<?php

namespace Modules\HR\Enums;

enum AcademicDegreeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.academic.degree.doctor_of_science_only'),
            self::TWO->value => trans('messages.academic.degree.candidate_of_science'),
            self::THREE->value => trans('messages.academic.degree.doctor_of_science'),
            self::FOUR->value => trans('messages.academic.degree.doctor_of_philosophy'),
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
