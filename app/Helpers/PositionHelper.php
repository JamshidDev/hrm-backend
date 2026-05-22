<?php

namespace App\Helpers;

use Modules\HR\Enums\DepartmentLevelEnum;

class PositionHelper
{
    public static function getFullPosition($workerPosition): string
    {
        $position = $workerPosition->position?->name;
        if (!$position) {
            return '';
        }
        if ($workerPosition->department?->level !== DepartmentLevelEnum::CENTER->value) {
            $position = $workerPosition->department?->name . ' ' . $position;
        }
        $position = trim($workerPosition->organization->full_name . ' ' . $position);
        return self::replace($position);
    }

    public static function getShortPosition($workerPosition): string
    {
        if (!$workerPosition) {
            return '';
        }

        $position = $workerPosition->position?->name;

        if ($workerPosition->department?->level !== DepartmentLevelEnum::CENTER->value) {
            $position = $workerPosition->department?->name . ' ' . $position;
        }
        $position = ucfirst(trim($position));
        return self::replace($position);
    }

    public static function replace($position): array|string
    {
        return str_replace(
            [
                "bo'limi bo‘lim",
                "bo‘limi bo‘lim",
                "bo'limi bo'lim",
                'kotibiyati kotibiyat',
                'devonxona devonxona',
                'ofisi ofis',
                'filiali filial',
                'departamenti departament',
                'boshqarmasi boshqarma',
                'sexi sex',
                'deposi depo',
                'stansiyasi stansiya',
                'bekati bekat',
                'markazi markaz',
                'muassasasi muassasa',
                'uchastkasi uchastka'
            ],
            [
                "bo‘limi",
                "bo‘limi",
                "bo‘limi",
                'kotibiyati',
                'devonxona',
                'ofis',
                'filiali',
                'departament',
                'boshqarmasi',
                'sexi',
                'deposi',
                'stansiyasi',
                'bekati',
                'markaz',
                'muassasasi',
                'uchastkasi'
            ],
            $position
        );
    }

    public static function replacePositionSymbol($position): string
    {
        $vowels = ['a', 'e', 'i', 'o', 'u'];

        // oxirgi harfni olish
        $lastChar = mb_substr($position, -1);

        // agar oxirgi unli bo‘lsa, uni o‘chir
        if (in_array($lastChar, $vowels, true)) {
            return mb_substr($position, 0, -1);
        }

        return $position;
    }
}
