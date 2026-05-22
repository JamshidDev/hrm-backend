<?php

namespace Modules\Economist\Enums;

enum UploadTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;

    public function label(): string
    {
        return trans(match ($this) {
            self::ONE => 'messages.economist.upload_types.one',
            self::TWO => 'messages.economist.upload_types.two',
            self::THREE => 'messages.economist.upload_types.three',
            self::FOUR => 'messages.economist.upload_types.four'
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
