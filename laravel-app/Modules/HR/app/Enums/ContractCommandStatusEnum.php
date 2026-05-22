<?php

namespace Modules\HR\Enums;

enum ContractCommandStatusEnum: int
{
    case NOT_CREATED = 1;
    case FORMED = 2;
    case NOT_MANDATORY = 3;

    public function label(): string
    {
        return match ($this) {
            self::NOT_CREATED => trans('messages.contract_command.status.not_created'),
            self::FORMED => trans('messages.contract_command.status.formed'),
            self::NOT_MANDATORY => trans('messages.contract_command.status.not_mandatory'),
        };
    }

    public static function list(): array
    {
        return array_map(fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }

    public static function get(int $key): string
    {
        foreach (self::cases() as $case) {
            if ($case->value === $key) {
                return $case->label();
            }
        }
        return "";
    }
}
