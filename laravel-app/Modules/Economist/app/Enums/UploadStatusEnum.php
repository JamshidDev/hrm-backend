<?php

namespace Modules\Economist\Enums;

enum UploadStatusEnum: int
{
    case PROCESS = 1;
    case RELOADED = 2;
    case SUCCESS = 3;
    case ERROR = 4;

    public function label(): string
    {
        return trans(match ($this) {
            self::PROCESS => 'messages.economist.upload_statuses.one',
            self::RELOADED => 'messages.economist.upload_statuses.two',
            self::SUCCESS => 'messages.economist.upload_statuses.three',
            self::ERROR => 'messages.economist.upload_statuses.four'
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
        return array_map(static fn($case) => ['id' => $case->value, 'name' => $case->label()], self::cases());
    }
}
