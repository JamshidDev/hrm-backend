<?php

namespace App\Services\Telegram;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\Telegram\UsersResource;
use App\Jobs\Telegram\TelegramPushJob;
use App\Models\UserTelegram;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Cache;

class TelegramPushService
{
    private const PUSH_LOCK_KEY = 'telegram_push_lock';
    private const PUSH_LOCK_TTL = 600;
    private const CHUNK_SIZE = 500;

    public function broadcast(string $text, array $idsIn = [], array $idsNotIn = []): void
    {
        $lock = Cache::lock(self::PUSH_LOCK_KEY, self::PUSH_LOCK_TTL);

        if (!$lock->get()) {
            throw new HttpResponseException(
                Helper::response('Another mass push is already running', [], 429)
            );
        }

        try {
            UserTelegram::query()
                ->when($idsIn, fn($q) => $q->whereIn('id', $idsIn))
                ->when($idsNotIn, fn($q) => $q->whereNotIn('id', $idsNotIn))
                ->chunk(self::CHUNK_SIZE, function ($workers) use ($text) {
                    $messages = $workers->map(fn($w) => [
                        'user_id' => $w->user_id,
                        'chat_id' => $w->chat_id,
                        'text' => $text,
                    ])->toArray();

                    dispatch(new TelegramPushJob($messages));
                });
        } finally {
            $lock->release();
        }
    }

    public function paginateUsers(array $filters)
    {
        $perPage = $filters['per_page'] ?? 20;
        $birthdaysOnly = !empty($filters['birthdays']);

        $employees = UserTelegram::query()
            ->when($birthdaysOnly, function ($q) {
                $today = now()->format('m-d');
                $q->whereHas('user', function ($query) use ($today) {
                    $query->whereHas('worker', function ($query) use ($today) {
                        $query->whereRaw("to_char(birthday, 'MM-DD') = ?", [$today]);
                    });
                });
            })
            ->with([
                'user.worker:id,first_name,last_name,middle_name',
            ])
            ->whereNot('id', 101)
            ->paginate($perPage);

        return PaginateResource::make($employees, UsersResource::class);
    }
}
