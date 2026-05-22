<?php

namespace Modules\HR\Enums;

enum MilitaryStatusEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.worker.military_status.one'),
            self::TWO->value => trans('messages.worker.military_status.two'),
            self::THREE->value => trans('messages.worker.military_status.three'),
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
