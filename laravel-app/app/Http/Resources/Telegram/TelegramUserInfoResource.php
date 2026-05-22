<?php

namespace App\Http\Resources\Telegram;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TelegramUserInfoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'chat_id' => $this->chat_id,
            'phone'   => $this->phone,
            'user'    => new UserInfoResource($this?->user)
        ];
    }
}
