<?php

namespace Modules\HR\Enums;

enum OrganizationDocumentTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.organization_documents.one'),
            self::TWO => trans('messages.organization_documents.two'),
            self::THREE => trans('messages.organization_documents.three'),
        };
    }

    public static function all(): array
    {
        return array_column(self::cases(), 'label', 'value');
    }

    public static function get(self $enum): string
    {
        return $enum->label();
    }

    public static function list(): array
    {
        return array_map(static fn ($enum) => ['id' => $enum->value, 'name' => $enum->label()], self::cases());
    }
}
