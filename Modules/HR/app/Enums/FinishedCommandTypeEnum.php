<?php

namespace Modules\HR\Enums;

enum FinishedCommandTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public static function all(): array
    {
        return array_combine(
            array_column(self::cases(), 'value'),
            array_map(fn($case) => trans("messages.command.finished.types." . strtolower($case->name)), self::cases())
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
