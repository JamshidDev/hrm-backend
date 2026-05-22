<?php

namespace Modules\HR\Enums;

enum ProbationEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;

    public static function all($locale): array
    {
        return [
            self::ONE->value   => trans('messages.worker.probation.one', [], $locale),
            self::TWO->value   => trans('messages.worker.probation.two', [], $locale),
            self::THREE->value => trans('messages.worker.probation.three', [], $locale),
            self::FOUR->value  => trans('messages.worker.probation.four', [], $locale),
            self::FIVE->value  => trans('messages.worker.probation.five', [], $locale),
            self::SIX->value   => trans('messages.worker.probation.six', [], $locale),
        ];
    }

    public static function get(int $key, $locale): string
    {
        $locale = $locale ?: app()->getLocale();

        return self::all($locale)[$key] ?? "";
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
