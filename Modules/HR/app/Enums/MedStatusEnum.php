<?php

namespace Modules\HR\Enums;

enum MedStatusEnum: int
{
    case ONE = 1;
    case TWO = 2;

    public static function all(): array
    {
        return [
            self::ONE->value => trans('messages.worker.med.one'),
            self::TWO->value => trans('messages.worker.med.two')
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
