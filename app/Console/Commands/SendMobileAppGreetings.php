<?php

namespace App\Console\Commands;

use App\Enums\TelegramMessageTypeEnum;
use App\Jobs\Telegram\TelegramPushJob;
use App\Models\UserTelegram;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SendMobileAppGreetings extends Command
{
    protected $signature = 'telegram:send-mobile-app-greetings';
    protected $description = "Mobile app update notification";

    public function handle(): void
    {
        if (Cache::has('telegram_mobile_app_message_push_lock')) {
            return;
        }
        Cache::put('telegram_mobile_app_message_push_lock', true, now()->addMinutes(120));
        $today = now();

        $employees = UserTelegram::query()
            ->whereNot('user_id', 61100)
            ->get();

        if ($employees->isEmpty()) {
            return;
        }

        $messages = $employees->map(fn($e) => [
            'chat_id' => (string)$e->chat_id,
            'user_id' => (int)$e->user_id,
            'text' => $this->buildMessage($e->user->worker->full_name()),
        ])->values()->toArray();

        TelegramPushJob::dispatch($messages, TelegramMessageTypeEnum::MOBILE_APP->value);
    }

    protected function buildMessage(string $name): string
    {
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return <<<HTML
🚀 <b>YANGILIK!</b>

Mobil ilovamiz endi rasmiy ravishda <b>Google Play Market</b> va <b>App Store</b> da mavjud! 📱

Endi barcha asosiy funksiyalardan to‘g‘ridan-to‘g‘ri mobil qurilmangiz orqali foydalanishingiz mumkin:
• Profil va ma’lumotlarni ko‘rish
• Ariza va so‘rovlar yuborish
• Bildirishnomalarni real vaqt rejimida olish
• Ish jarayonlarini tez va qulay boshqarish

🔐 <b>Muhim!</b> Ilovaga kirish jarayonida yoki kirgandan so‘ng Face ID (yuzni aniqlash) orqali shaxsingizni tasdiqlashingiz tavsiya etiladi.
Bu sizga qo‘shimcha ma’lumotlar va kengaytirilgan funksiyalardan foydalanish imkonini beradi.

🔔 Shuningdek, ilova bildirishnomalarini yoqilgan holatda saqlang — barcha muhim yangilik va xabarlarni o‘z vaqtida olasiz.

🔽 Ilovani yuklab olish:
👉 Play Market: https://play.google.com/store/apps/details?id=hrms.railway.uz
👉 App Store: https://apps.apple.com/us/app/hr-rail/id6759365016

Ilovani yuklab oling va baho qoldirishni unutmang — sizning fikringiz biz uchun muhim!

<b>Hurmat bilan, "O‘zbekiston temir yo‘llari" AJ</b>
HTML;
    }
}
