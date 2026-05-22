<?php

namespace Modules\Exam\Enums;

enum TopicTypeEnum: int
{

    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;

    public static function all(): array
    {
        return array_combine(
            array_map(static fn($case) => $case->value, self::cases()),
            array_map(static fn($case) => $case->label(), self::cases())
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.exam.exam_types.one'),
            self::TWO => trans('messages.exam.exam_types.two'),
            self::THREE => trans('messages.exam.exam_types.three'),
            self::FOUR => trans('messages.exam.exam_types.four')
        };
    }

    public static function listForExamination(): array
    {
        return [
            [
                'id' => self::ONE->value,
                'name' => trans('messages.exam.exam_types.one'),
            ],
            [
                'id' => self::FOUR->value,
                'name' => trans('messages.exam.exam_types.four'),
            ]
        ];
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }

}
