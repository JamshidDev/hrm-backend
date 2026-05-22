<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\CityResource;

class UserOrganizationEditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'command_name' => $this->command_address ?? $this->city?->name,
            'address' => $this->address,
            'city' => new CityResource($this->city)
        ];
    }
}
