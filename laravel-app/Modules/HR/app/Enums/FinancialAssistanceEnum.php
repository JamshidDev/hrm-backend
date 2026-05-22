<?php

namespace Modules\HR\Enums;

enum FinancialAssistanceEnum: int
{
    case ONE = 1;
    case TWO = 2;

    public static function get(int $key, $locale): string
    {
        $locale = $locale ?: app()->getLocale();
        return self::all($locale)[$key] ?? "";
    }

    public static function all($locale): array
    {
        return [
            self::ONE->value   => trans('messages.financial_assistance.types.one', [], $locale),
            self::TWO->value   => trans('messages.financial_assistance.types.two', [], $locale),
        ];
    }

    public static function list(): array
    {
        $locale = app()->getLocale();
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all($locale)),
            self::all($locale)
        );
    }
}
