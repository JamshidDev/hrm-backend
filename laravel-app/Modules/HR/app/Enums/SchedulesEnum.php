<?php

namespace Modules\HR\Enums;

enum SchedulesEnum: int
{
    case DAILY = 1;
    case WEEKLY = 2;
    case SHIFT = 3;

    public static function all(): array
    {
        return array_combine(
            array_column(self::cases(), 'value'),
            array_map(static fn($case) => trans("messages.schedules." . strtolower($case->name)), self::cases())
        );
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
