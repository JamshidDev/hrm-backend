<?php

namespace Modules\Economist\Enums;

enum ChangedStatusEnum: int
{
    case CREATED = 1;
    case UPDATED = 2;
    case DELETED = 3;

    public function label(): string
    {
        return trans(match ($this) {
            self::CREATED => 'messages.economist.changed.change_statuses.created',
            self::UPDATED => 'messages.economist.changed.change_statuses.updated',
            self::DELETED => 'messages.economist.changed.change_statuses.deleted',
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
