<?php

namespace Modules\HR\Enums;

enum DepartmentLevelEnum: int
{
    case CENTER = 1;
    case DEPARTMENT = 2;
    case MANAGEMENT = 3;
    case DEPT = 4;
    case SEX = 5;
    case SECTOR = 6;
    case GROUP = 7;
    case STATION = 8;
    case BUREAU = 9;
    case BRANCH = 10;
    case BRIGADE = 11;
    case ESTABLISHMENT = 12;
    case PLOT = 13;
    case CENTRAL = 14;

    public static function all(): array
    {
        return [
            self::CENTER->value        => trans('messages.department.level.center'),
            self::DEPARTMENT->value    => trans('messages.department.level.department'),
            self::MANAGEMENT->value    => trans('messages.department.level.management'),
            self::DEPT->value          => trans('messages.department.level.dept'),
            self::SEX->value           => trans('messages.department.level.sex'),
            self::SECTOR->value        => trans('messages.department.level.sector'),
            self::GROUP->value         => trans('messages.department.level.group'),
            self::STATION->value       => trans('messages.department.level.station'),
            self::BUREAU->value        => trans('messages.department.level.bureau'),
            self::BRANCH->value        => trans('messages.department.level.branch'),
            self::BRIGADE->value       => trans('messages.department.level.brigade'),
            self::ESTABLISHMENT->value => trans('messages.department.level.establishment'),
            self::PLOT->value          => trans('messages.department.level.plot'),
            self::CENTRAL->value          => trans('messages.department.level.central'),
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
