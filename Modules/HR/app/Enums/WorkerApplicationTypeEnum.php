<?php

namespace Modules\HR\Enums;

enum WorkerApplicationTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;
    case NINE = 9;
    case TEN = 10;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.application.types.one'),
            self::TWO => trans('messages.application.types.two'),
            self::THREE => trans('messages.application.types.three'),
            self::FOUR => trans('messages.application.types.four'),
            self::FIVE => trans('messages.application.types.five'),
            self::SIX => trans('messages.application.types.six'),
            self::SEVEN => trans('messages.application.types.seven'),
            self::EIGHT => trans('messages.application.types.eight'),
            self::NINE => trans('messages.application.types.nine'),
            self::TEN => trans('messages.application.types.ten'),
        };
    }

    public static function all(): array
    {
        return array_column(self::cases(), 'value', 'name');
    }

    public static function createTypes(): array
    {
        return [self::ONE->value, self::TWO->value];
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function createApplicationTypes(): array
    {
        return array_map(static fn($enum) => [
            'id'   => $enum->value,
            'name' => $enum->label()
        ], self::cases());
    }

    public static function list(): array
    {
        return self::createApplicationTypes();
    }

    public static function mobileList(): array
    {
        return [
            [
                'value' => self::ONE->value,
                'name' => trans('messages.application.types.one'),
                'description' => "To'liq shtat bo'yicha qabul qilish",
                'icon' => 'Briefcase24Regular',
                'color' => '#007AFF',
                'status' => true,
            ],
            [
                'value' => self::TWO->value,
                'name' => trans('messages.application.types.two'),
                'description' => 'Muddatli mehnat shartnomasi',
                'icon' => 'CalendarLtr24Regular',
                'color' => '#5856D6',
                'status' => true,
            ],
            [
                'value' => self::THREE->value,
                'name' => trans('messages.application.types.three'),
                'description' => "Oldindan rejalashtirilgan ta'til",
                'icon' => 'CalendarLtr24Regular',
                'color' => '#34C759',
                'status' => true,
            ],
            [
                'value' => self::FOUR->value,
                'name' => trans('messages.application.types.four'),
                'description' => "Haq to'lanmaydigan ta'til",
                'icon' => 'CalendarLtr24Regular',
                'color' => '#FF9500',
                'status' => true,
            ],
            [
                'value' => self::FIVE->value,
                'name' => trans('messages.application.types.five'),
                'description' => "Qisman haq to'lanadigan ta'til",
                'icon' => 'Money24Regular',
                'color' => '#FF9500',
                'status' => true,
            ],
            [
                'value' => self::SIX->value,
                'name' => trans('messages.application.types.six'),
                'description' => "Lavozim o'zgartirish",
                'icon' => 'PersonSwap24Regular',
                'color' => '#007AFF',
                'status' => true,
            ],
            [
                'value' => self::SEVEN->value,
                'name' => trans('messages.application.types.seven'),
                'description' => "Ko'chirish uchun rozilik",
                'icon' => 'Checkmark24Regular',
                'color' => '#34C759',
                'status' => true,
            ],
            [
                'value' => self::EIGHT->value,
                'name' => trans('messages.application.types.eight'),
                'description' => "Ta'lim uchun ta'til",
                'icon' => 'BookOpen24Regular',
                'color' => '#5856D6',
                'status' => true,
            ],
            [
                'value' => self::NINE->value,
                'name' => trans('messages.application.types.nine'),
                'description' => "Moliyaviy yordam so'rash",
                'icon' => 'Money24Regular',
                'color' => '#007AFF',
                'status' => true,
            ],
            [
                'value' => self::TEN->value,
                'name' => trans('messages.application.types.ten'),
                'description' => "Ishdan bo'shash arizasi",
                'icon' => 'Dismiss24Regular',
                'color' => '#FF3B30',
                'status' => true,
            ],
        ];
    }


}
