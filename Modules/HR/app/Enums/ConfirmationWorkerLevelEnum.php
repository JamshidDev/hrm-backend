<?php

namespace Modules\HR\Enums;

enum ConfirmationWorkerLevelEnum: int
{
    case DIRECTOR = 1;
    case SIGNATURE = 2;

    public static function all(): array
    {
        return [
            self::DIRECTOR->value  => trans('messages.confirmation_worker.level.director'),
            self::SIGNATURE->value => trans('messages.confirmation_worker.level.confirmatory'),
        ];
    }

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => ['id' => $case->value, 'name' => self::get($case->value)], self::cases());
    }
}
