<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserTelegramAccountsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'phone'      => $this->phone,
            'user' => new UserInfoResource($this->user),
            'chat_id'    => $this->chat_id,
            'tg_id'      => $this->tg_id,
            'created_at' => $this->created_at
        ];
    }
}
