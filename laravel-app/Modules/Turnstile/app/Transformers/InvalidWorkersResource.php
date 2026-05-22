<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class InvalidWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'photo' => Helper::fileUrl($this->photo->photo),
            'updated_at' => $this->updated_at
        ];
    }
}
