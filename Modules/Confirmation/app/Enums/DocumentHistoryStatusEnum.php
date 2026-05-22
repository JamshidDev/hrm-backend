<?php

namespace Modules\Confirmation\Enums;

enum DocumentHistoryStatusEnum: int
{
    case CREATED = 1;
    case UPDATED = 2;
    case REJECTED = 3;
    case DELETED = 4;

    public function label(): string
    {
        return trans(match ($this) {
            self::CREATED => 'messages.document.created',
            self::UPDATED => 'messages.document.updated',
            self::REJECTED => 'messages.document.rejected',
            self::DELETED => 'messages.document.deleted',
        });
    }

    public static function all(): array
    {
        return array_column(self::cases(), 'label', 'value');
    }

    public static function get(int $value): string
    {
        return self::tryFrom($value)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(fn($case) => ['id' => $case->value, 'name' => $case->label()], self::cases());
    }
}
