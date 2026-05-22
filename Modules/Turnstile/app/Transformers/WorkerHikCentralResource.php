<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\HR\Transformers\Worker\WorkerPhotoResource;

class WorkerHikCentralResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'personId' => $this->hik_central_person_id,
            'worker' => new WorkerMinimalResource($this->worker),
            'post_name' => PositionHelper::getShortPosition($this->worker->position),
            'access_levels' => WorkerAccessLevelResource::collection($this->access_levels),
            'photo' => new WorkerPhotoResource($this->photo),
            'to' => $this->to,
            'updated_at' => $this->updated_at
        ];
    }
}
