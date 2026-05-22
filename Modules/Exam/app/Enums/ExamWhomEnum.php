<?php

namespace Modules\Exam\Enums;

use Modules\HR\Models\Worker;
use Modules\Structure\Models\Position;

enum ExamWhomEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.exam.exam_whom.one'),
            self::TWO => trans('messages.exam.exam_whom.two'),
            self::THREE => trans('messages.exam.exam_whom.three'),
            self::FIVE => trans('messages.exam.exam_whom.five'),
            self::FOUR => trans('messages.exam.exam_whom.four'),
        };
    }

    public function model(): ?string
    {
        return match ($this) {
            self::ONE, self::FOUR => null,
            self::TWO => Position::class,
            self::THREE, self::FIVE => Worker::class,
        };
    }

    public static function all(): array
    {
        return array_combine(
            array_map(static fn($case) => $case->value, self::cases()),
            array_map(static fn($case) => $case->label(), self::cases())
        );
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function getModel(int $key): ?string
    {
        return self::tryFrom($key)?->model();
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}
