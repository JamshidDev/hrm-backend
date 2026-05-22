<?php

namespace Modules\Chat\Http\Controllers;

use App\Enums\TelegramMessageTypeEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'telegram_message_types' => TelegramMessageTypeEnum::list(),
        ]);
    }
}
