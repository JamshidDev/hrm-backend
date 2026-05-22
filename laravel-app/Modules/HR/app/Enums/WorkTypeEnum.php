<?php

namespace Modules\HR\Enums;

enum WorkTypeEnum: int
{
    case ONE = 1;

    public static function all(): array
    {
        return array_combine(
            array_column(self::cases(), 'value'),
            array_map(static fn($case) => trans("messages.vacancy.work_types." . strtolower($case->name)), self::cases())
        );
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
