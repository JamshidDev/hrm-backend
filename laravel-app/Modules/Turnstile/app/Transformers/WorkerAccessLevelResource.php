<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class WorkerAccessLevelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->access_level?->name,
            'access_level_id' => $this->hik_central_access_level_id,
            'status' => $this->status
        ];
    }
}
