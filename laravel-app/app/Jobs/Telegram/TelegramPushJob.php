<?php

namespace App\Jobs\Telegram;

use App\Enums\TelegramMessageTypeEnum;
use App\Models\TelegramMessage;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Modules\Turnstile\Services\TurnstileService;
use Throwable;

class TelegramPushJob implements ShouldQueue
{
    use Queueable;

    protected array $data = [];
    protected int $type;

    protected string $url;
    protected string $token;

    public function __construct($type, $data = [])
    {
        $this->data = $data;
        $this->type = $type;
        $this->token = config('services.telegram.bot_token');
        $this->url = "https://api.telegram.org/bot{$this->token}/sendMessage";

    }

    public function handle(TurnstileService $turnstileService): void
    {
        match ($this->type) {
            TelegramMessageTypeEnum::BIRTHDAYS->value => $this->birthdays(),
            TelegramMessageTypeEnum::TURNSTILE_STATS->value => $this->turnstileStats($turnstileService),
        };
    }

    private function turnstileStats($turnstileService): void
    {
        $date = now()->subDay();
        $users = User::whereIn('id', $this->data['userIds'])->get();

        foreach ($users as $user) {
            $statsForTurnstile = $turnstileService->statsForTurnstile($user, $date);
            $scheduleStatsByMonth = $turnstileService->scheduleStatsByMonth($user, $date);
            $devices = $turnstileService->devives($user);
            $lateAndEarlyStatsGroupedByDays = $turnstileService->lateAndEarlyStatsGroupedByDays($user, $date);

            $data = [
                "📊 <b>Turniket statistikasi (" . $date->format('d.m.Y') . ")</b>",
                "",

                "👥 <b>Umumiy xodimlar:</b> " . ($statsForTurnstile['totalWorkers'] ?? 0),

                "📉 <b>Grafiksiz xodimlar (oy):</b> " . ($scheduleStatsByMonth['count'] ?? 0),
                "<i>— Ushbu oyda ish grafigi tuzilmagan xodimlar</i>",

                "📅 <b>Bugun kelishi kerak:</b> " . ($statsForTurnstile['scheduled_workers_today'] ?? 0),
                "<i>— Grafik bo'yicha bugun ish kuni bo'lgan xodimlar</i>",

                "✅ <b>Ishga kelgan:</b> " . ($statsForTurnstile['attended_workers_today'] ?? 0),
                "<i>— Umumiy ishga kelgan xodimlar (Grafik yaratilgan, yaratilmagan, Dam kuni ... - barcha xodimlar kesimida)</i>",

                "❌ <b>Ishga kelmagan:</b> " . ($statsForTurnstile['absent_workers_today'] ?? 0),
                "<i>— Grafik bo'yicha ish kuni, lekin ishga kelmagan xodimlar</i>",

                "",

                "🖥 <b>Qurilmalar:</b>",
                "• Jami: " . ($devices['all'] ?? 0),
                "<i>— Tizimga ulangan barcha qurilmalar</i>",
                "• 🟢 Online: " . ($devices['online'] ?? 0),
                "<i>— Hozir faol ishlayotgan qurilmalar</i>",
                "• 🔴 Offline: " . ($devices['offline'] ?? 0),
                "<i>— Hozirda tizim bilan aloqasi uzilgan qurilmalar</i>",

                "",

                "⏰ <b>Intizom:</b>",
                "• Kech kelganlar: " . ($lateAndEarlyStatsGroupedByDays['late_and_early']['late'][0]['count'] ?? 0),
                "<i>— Ish boshlanish vaqtidan kech kelganlar</i>",
                "• Vaqtli ketganlar: " . ($lateAndEarlyStatsGroupedByDays['late_and_early']['early'][0]['count'] ?? 0),
                "<i>— Ish vaqti tugashidan oldin chiqib ketganlar</i>",
            ];

            $messageText = implode("\n", $data);

            try {
                $payload = [
                    'chat_id' => $user->telegram->chat_id,
                    'text' => $messageText,
                    'parse_mode' => 'HTML',
                    'disable_web_page_preview' => true,
                ];

                $response = Http::timeout(10)->post($this->url, $payload);

                if ($response->status() === 429) {
                    sleep(15);
                    continue;
                }

                if ($response->successful()) {
                    TelegramMessage::create([
                        'user_id' => $user->id,
                        'chat_id' => $user->telegram->chat_id,
                        'message' => $messageText,
                        'status' => 1,
                        'type' => $this->type
                    ]);
                } else {
                    TelegramMessage::create([
                        'user_id' => $user->id,
                        'chat_id' => $user->telegram->chat_id,
                        'message' => $messageText,
                        'status' => 0,
                        'error_msg' => $response->body(),
                        'type' => $this->type
                    ]);
                }

            } catch (Throwable $e) {
                TelegramMessage::create([
                    'user_id' => $user->id,
                    'chat_id' => $user->telegram->chat_id,
                    'message' => $messageText,
                    'status' => 0,
                    'error_msg' => $e->getMessage(),
                    'type' => $this->type
                ]);
            }

            //Telegram rate limitdan qochish
            usleep(random_int(300000, 900000));
        }


    }

    private function birthdays(): void
    {
        $messages = $this->data['messages'];
        foreach ($messages as $msg) {
            try {
                $payload = [
                    'chat_id' => $msg['chat_id'],
                    'text' => $msg['text'],
                    'parse_mode' => 'HTML',
                    'disable_web_page_preview' => true,
                ];
                $checkSentUser = TelegramMessage::query()
                    ->where('user_id', $msg['user_id'])
                    ->where('message', $msg['text'])
                    ->where('status', 1)
                    ->exists();

                if ($checkSentUser) {
                    continue;
                }

                $response = Http::timeout(10)->post($this->url, $payload);
                if ($response->status() === 429) {
                    sleep(15);
                    continue;
                }

                if ($response->successful()) {
                    TelegramMessage::create([
                        'user_id' => $msg['user_id'],
                        'chat_id' => $msg['chat_id'],
                        'message' => $msg['text'],
                        'status' => 1,
                        'type' => $this->type
                    ]);
                } else {
                    TelegramMessage::create([
                        'user_id' => $msg['user_id'],
                        'chat_id' => $msg['chat_id'],
                        'message' => $msg['text'],
                        'status' => 0,
                        'error_msg' => $response->body(),
                        'type' => $this->type
                    ]);
                }
            } catch (Throwable $e) {
                TelegramMessage::create([
                    'user_id' => $msg['user_id'],
                    'chat_id' => $msg['chat_id'],
                    'message' => $msg['text'],
                    'status' => 0,
                    'error_msg' => $e->getMessage(),
                    'type' => $this->type
                ]);
            }
            usleep(random_int(300000, 900000));
        }
    }
}
