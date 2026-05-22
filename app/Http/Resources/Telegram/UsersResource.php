<?php

namespace App\Http\Resources\Telegram;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'user' => new UserInfoResource($this->user),
            'chat_id' => $this->chat_id,
            'phone'   => $this->phone
        ];
    }
}
