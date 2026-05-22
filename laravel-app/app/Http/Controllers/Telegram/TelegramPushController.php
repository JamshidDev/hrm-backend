<?php

namespace App\Http\Controllers\Telegram;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Telegram\TelegramUsersIndexRequest;
use App\Services\Telegram\TelegramPushService;
use Illuminate\Http\JsonResponse;

class TelegramPushController extends Controller
{
    private const SALARY_ANNOUNCEMENT_TEXT = "📢 <b>Hurmatli xodimlar!</b>

Sizlar uchun yangi qulaylik ishga tushirildi ✅
Endi <b>Telegram bot</b> orqali <b>oylik maosh ma'lumotlaringizni</b> onlayn ko'rishingiz mumkin.

👉 Bot menusida: <b>Xizmatlar → 💰 Oylik maosh</b> bo'limi orqali ma'lumotlaringizni tekshiring.

ℹ️ Xizmat 24/7 rejimida ishlaydi va barcha xodimlar uchun mavjud.";

    public function __construct(private readonly TelegramPushService $service)
    {
    }

    public function sendMessage(): JsonResponse
    {
        $this->service->broadcast(
            self::SALARY_ANNOUNCEMENT_TEXT,
            idsIn: [1, 99],
            idsNotIn: [101],
        );

        return Helper::response('Mass push queued');
    }

    public function telegramUsers(TelegramUsersIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginateUsers($request->validated()));
    }
}
