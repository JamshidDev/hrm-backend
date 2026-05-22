<?php

namespace App\Console\Commands;

use App\Enums\TelegramMessageTypeEnum;
use App\Jobs\Telegram\TelegramPushJob;
use App\Models\UserTelegram;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SendBirthdayGreetings extends Command
{
    protected $signature = 'telegram:send-birthdays';
    protected $description = 'Send birthday greetings every 7:50 AM';

    public function handle(): void
    {
        if (Cache::has('telegram_message_push_lock')) {
            return;
        }
        Cache::put('telegram_message_push_lock', true, now()->addMinutes(2));
        $today = now();

        $employees = UserTelegram::query()
            ->whereHas('user', function ($query) use ($today) {
                $query->whereHas('worker', function ($query) use ($today) {
                    $query->whereMonth('birthday', $today->month)
                        ->whereDay('birthday', $today->day);
                });
            })
            ->get();

        if ($employees->isEmpty()) {
            return;
        }

        $messages = $employees
            ->map(fn($e) => [
                'chat_id' => (string)$e->chat_id,
                'user_id' => (int)$e->user_id,
                'text' => $this->buildMessage($e->user->worker->full_name()),
            ])
            ->values()
            ->toArray();

        TelegramPushJob::dispatch(TelegramMessageTypeEnum::BIRTHDAYS->value, [
            'messages' => $messages,
        ]);
    }

    protected function buildMessage(string $name): string
    {
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return <<<HTML
🎉 <b>Tabriklaymiz, {$safeName}!</b>

Sizni bugungi tug‘ilgan kuningiz bilan chin dildan qutlaymiz!
Yaxshi kayfiyat, mustahkam sog‘liq va katta muvaffaqiyatlar tilaymiz! 🥳

<b>Hurmat bilan:</b>
"O‘zbekiston temir yo‘llari" AJ
HTML;
    }
}
