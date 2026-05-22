<?php

namespace Modules\TimeSheet\Enums;

enum TimeSheetWorkerStatusEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;

    public static function all(): array
    {
        return [
            self::ONE->value   => trans('messages.timesheet.worker_status.work'),
            self::TWO->value   => trans('messages.timesheet.worker_status.vacation'),
            self::THREE->value => trans('messages.timesheet.worker_status.reason'),
            self::FOUR->value => trans('messages.timesheet.worker_status.not_working'),
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
