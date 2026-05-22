<?php

namespace Modules\Structure\Enums;

enum OrganizationServiceEnum: string
{
    case E_SIGNATURE = 'e-signature';
    case SMS_SERVICE = 'sms-service';

    public function label(): string
    {
        return match ($this) {
            self::E_SIGNATURE => __("E-imzo"),
            self::SMS_SERVICE => __("Eskiz sms"),
        };
    }

    public static function all(): array
    {
        return array_combine(
            array_map(fn($case) => $case->value, self::cases()),
            array_map(fn($case) => $case->label(), self::cases())
        );
    }

    public static function get(string $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}
