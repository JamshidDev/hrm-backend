<?php

namespace Modules\Confirmation\Enums;

enum ConfirmationTypeEnum: int
{
    case DIGITAL = 1;
    case BIOMETRIC = 2;
    case BUTTON = 3;
    case NOT_CONFIRMED = 4;

    public function label(): string
    {
        return trans(match ($this) {
            self::DIGITAL => 'messages.confirmation.signature_methods.digital',
            self::BIOMETRIC => 'messages.confirmation.signature_methods.biometric',
            self::BUTTON => 'messages.confirmation.signature_methods.button',
            self::NOT_CONFIRMED => 'messages.confirmation.signature_methods.not_confirmed',
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
