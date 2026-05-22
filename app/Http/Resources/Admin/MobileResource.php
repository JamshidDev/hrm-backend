<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MobileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new UserInfoResource($this->user),
            'device_model' => $this->device_model,
            'device_name' => $this->device_name,
            'platform' => $this->platform,
            'face' => $this->face,
            'created_at' => $this->created_at->toDateTimeString()
        ];
    }
}
