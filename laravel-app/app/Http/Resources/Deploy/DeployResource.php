<?php

namespace App\Http\Resources\Deploy;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeployResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user'       => new UserInfoResource($this->user),
            'changes'    => $this->changes,
            'version'    => $this->version,
            'type'       => $this->type,
            'published'  => $this->published,
            'created_at' => $this->created_at
        ];
    }
}
