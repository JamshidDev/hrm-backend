<?php

namespace Modules\Confirmation\Enums;

enum ConfirmationStatusEnum: int
{
    case PROCESS = 1;
    case READ = 2;
    case SUCCESS = 3;
    case REJECTED = 4;
    case DELETED = 5;

    public function label(): string
    {
        return trans(match ($this) {
            self::PROCESS => 'messages.confirmation.status.process',
            self::READ => 'messages.confirmation.status.read',
            self::SUCCESS => 'messages.confirmation.status.success',
            self::REJECTED => 'messages.confirmation.status.rejected',
            self::DELETED => 'messages.confirmation.status.deleted',
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
