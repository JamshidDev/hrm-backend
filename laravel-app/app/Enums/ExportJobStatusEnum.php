<?php

namespace App\Enums;

enum ExportJobStatusEnum: int
{
    case PROCESS = 1;
    case DONE = 2;
    case ERROR = 3;

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function all(): array
    {
        return [
            self::PROCESS->value => trans('messages.job.statuses.process'),
            self::DONE->value    => trans('messages.job.statuses.done'),
            self::ERROR->value   => trans('messages.job.statuses.error'),
        ];
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
