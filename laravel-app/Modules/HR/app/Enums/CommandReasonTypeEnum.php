<?php

namespace Modules\HR\Enums;

enum CommandReasonTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;

    public static function all(): array
    {
        return [
            self::ONE->value   => __("pullik kompensatsiya bilan almashtirilsin"),
            self::TWO->value   => __("mazkur ish yili davomida berilsin"),
            self::THREE->value => __("xodimning keyingi ish yiliga ko‘chirilsin"),
            self::FOUR->value  => __("vaqtincha mehnatga layoqatsizlik ta'tilida"),
            self::FIVE->value  => __("o'quv ta'tilida"),
            self::SIX->value   => __("xomiladorlik va tug‘ish ta’tilida"),
            self::SEVEN->value => __("ellik olti"),
            self::EIGHT->value => __(
                "tug‘ish qiyin kechgan yoxud ikki yoki undan ortiq bola tug‘ilgan taqdirda yetmish"
            ),
        ];
    }

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function getReasonTypes($commandType): array
    {
        return match ($commandType) {
            CommandTypeEnum::FORTY_FOUR->value => [
                [
                    'id'   => self::ONE->value,
                    'name' => self::get(self::ONE->value)
                ],
                [
                    'id'   => self::TWO->value,
                    'name' => self::get(self::TWO->value)
                ],
                [
                    'id'   => self::THREE->value,
                    'name' => self::get(self::THREE->value)
                ]
            ],
            CommandTypeEnum::FORTY_THREE->value => [
                [
                    'id'   => self::FOUR->value,
                    'name' => self::get(self::FOUR->value)
                ],
                [
                    'id'   => self::FIVE->value,
                    'name' => self::get(self::FIVE->value)
                ],
                [
                    'id'   => self::SIX->value,
                    'name' => self::get(self::SIX->value)
                ]
            ],
            CommandTypeEnum::FORTY_EIGHT->value => [
                [
                    'id'   => self::SEVEN->value,
                    'name' => self::get(self::SEVEN->value)
                ],
                [
                    'id'   => self::EIGHT->value,
                    'name' => self::get(self::EIGHT->value)
                ]
            ],
            default => collect([
            ])->map(fn($enum) => ['id' => $enum->value, 'name' => $enum->label()])->toArray()
        };
    }
}
