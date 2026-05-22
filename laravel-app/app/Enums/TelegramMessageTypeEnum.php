<?php

namespace App\Enums;

enum TelegramMessageTypeEnum: int
{
    case BIRTHDAYS = 1;
    case VACATIONS = 2;
    case MED = 3;
    case PASSPORT = 4;
    case MOBILE_APP = 5;
    case TURNSTILE_STATS = 6;

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public function label(): string
    {
        return match ($this) {
            self::BIRTHDAYS => trans('messages.chat.telegram.messages.types.birthday'),
            self::VACATIONS => trans('messages.chat.telegram.messages.types.vacations'),
            self::MED => trans('messages.chat.telegram.messages.types.med'),
            self::PASSPORT => trans('messages.chat.telegram.messages.types.passport'),
            self::MOBILE_APP => trans('messages.chat.telegram.messages.types.mobile_app'),
            self::TURNSTILE_STATS => trans('messages.chat.telegram.messages.types.turnstile_stats'),
        };
    }

    public static function all(): array
    {
        return [
            self::BIRTHDAYS->value => trans('messages.chat.telegram.messages.types.birthday'),
            self::VACATIONS->value => trans('messages.chat.telegram.messages.types.vacations'),
            self::MED->value => trans('messages.chat.telegram.messages.types.med'),
            self::PASSPORT->value => trans('messages.chat.telegram.messages.types.passport'),
            self::MOBILE_APP->value => trans('messages.chat.telegram.messages.types.mobile_app'),
            self::TURNSTILE_STATS->value => trans('messages.chat.telegram.messages.types.turnstile_stats'),
        ];
    }

    public static function list(): array
    {
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all()),
            self::all()
        );
    }
}
