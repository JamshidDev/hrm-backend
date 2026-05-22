<?php

namespace Modules\Exam\Enums;

enum TopicFileEnum: int
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
            self::ONE => trans('messages.exam.topic.content_types.one'),
            self::TWO => trans('messages.exam.topic.content_types.two'),
            self::THREE => trans('messages.exam.topic.content_types.three'),
            self::FOUR => trans('messages.exam.topic.content_types.four'),
        };
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function getType($extension): int
    {
        $videoFormats = [
            "mp4",
            "avi",
            "mkv",
            "mov",
            "wmv",
            "flv",
            "webm",
            "mpeg",
            "mpg",
            "ogv",
            "ogg",
            "3gp",
            "3g2",
            "ts",
            "m2ts",
            "mts",
            "f4v"
        ];

        $imageFormats = [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "bmp",
            "webp",
            "tiff",
            "tif",
            "svg",
            "ico",
            "heic",
            "heif",
            "avif",
            "psd",
            "raw",
            "ai",
            "eps"
        ];

        $audioFormats = [
            "mp3",
            "wav",
            "aac",
            "flac",
            "ogg",
            "wma",
            "m4a",
            "alac",
            "opus",
            "amr",
            "aiff"
        ];

        $bookFormats = [
            "pdf",
            "epub",
            "mobi",
            "azw",
            "azw3",
            "fb2",
            "djvu",
            "txt",
            "rtf",
            "doc",
            "docx",
            "odt",
            "html",
            "htm"
        ];

        if (in_array($extension, $videoFormats, true)) {
            return self::ONE->value;
        }

        if (in_array($extension, $imageFormats, true)) {
            return self::TWO->value;
        }

        if (in_array($extension, $audioFormats, true)) {
            return self::FOUR->value;
        }

        return self::THREE->value;
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id'   => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}

