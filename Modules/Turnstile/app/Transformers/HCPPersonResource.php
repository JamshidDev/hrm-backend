<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerPhotoResource;

class HCPPersonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'access_levels' => WorkerAccessLevelResource::collection($this->access_levels),
            'photo' => new WorkerPhotoResource($this->photo),
            'to' => $this->to,
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s')
        ];
    }
}
