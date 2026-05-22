<?php

namespace Modules\HR\Enums;

enum PositionStatusEnum: int
{
    case PROCESS = 1;
    case ACTIVE = 2;
    case FINISHED = 3;

    public static function all(): array
    {
        return [
            self::PROCESS->value => trans('messages.contract.status.process'),
            self::ACTIVE->value => trans('messages.contract.status.active'),
            self::FINISHED->value => trans('messages.contract.status.finished'),
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
