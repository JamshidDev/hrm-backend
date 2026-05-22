<?php

namespace Modules\Economist\Enums;

enum ConfirmStatusEnum: int
{
    case NEW = 1;
    case PROCESS = 2;
    case DONE = 3;
    case REJECT = 4;

    public function label(): string
    {
        return trans(match ($this) {
            self::NEW => 'messages.economist.changed.confirm_statuses.new',
            self::PROCESS => 'messages.economist.changed.confirm_statuses.process',
            self::DONE => 'messages.economist.changed.confirm_statuses.done',
            self::REJECT => 'messages.economist.changed.confirm_statuses.reject',
        });
    }

    public static function all(): array
    {
        return array_column(self::cases(), 'label', 'value');
    }

    public static function get($value): string
    {
        return self::tryFrom($value)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => ['id' => $case->value, 'name' => $case->label()], self::cases());
    }
}
