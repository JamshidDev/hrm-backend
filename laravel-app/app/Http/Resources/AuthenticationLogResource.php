<?php

namespace App\Http\Resources;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticationLogResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new UserInfoResource($this->authenticatable),
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'login_at' => $this->login_at,
            'logout_at' => $this->logout_at
        ];
    }
}
