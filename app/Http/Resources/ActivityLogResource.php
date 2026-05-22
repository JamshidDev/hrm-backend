<?php

namespace App\Http\Resources;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject_type' => $this->subject_type,
            'properties' => $this->properties,
            'causer' => new UserInfoResource($this->causer),
            'description' => $this->description,
            'created_at' => $this->created_at
        ];
    }
}
