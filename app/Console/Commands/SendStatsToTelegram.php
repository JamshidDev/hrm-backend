<?php

namespace App\Console\Commands;

use App\Enums\TelegramMessageTypeEnum;
use App\Jobs\Telegram\TelegramPushJob;
use Illuminate\Console\Command;

class SendStatsToTelegram extends Command
{
    protected $signature = 'telegram:send-stats';
    protected $description = "Send stats from the previous day every day at 07:00";

    public function handle(): void
    {
        $userIds = [];

        if (count($userIds)) {
            TelegramPushJob::dispatch(TelegramMessageTypeEnum::TURNSTILE_STATS->value, [
                'userIds' => $userIds
            ]);
        }

    }
}
