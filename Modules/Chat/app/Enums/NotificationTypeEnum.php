<?php

namespace Modules\Chat\Enums;

enum NotificationTypeEnum: int
{
    case EMOJI = 1;
    case NOTIFICATION = 2;

    public function label(): string
    {
        return trans(match ($this) {
            self::EMOJI => 'emoji',
            self::NOTIFICATION => 'notification',
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
