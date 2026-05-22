<?php

namespace Modules\HR\Transformers\Worker\Relative;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Transformers\Worker\WorkerDisabilityResource;
use Modules\HR\Transformers\Worker\WorkerInfoResource;

class WorkerRelativeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'relative' => [
                'id' => $this->relative,
                'name' => RelativeEnum::get($this->relative, null)
            ],
            'relative_worker' => new WorkerInfoResource($this->relative_worker),
            'birthday' => $this->birthday,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birth_place' => $this->birth_place,
            'post_name' => $this->post_name,
            'address' => $this->address,
            'disabilities' => $this->whenLoaded('disabilities', fn() => WorkerDisabilityResource::collection($this->disabilities))
        ];
    }
}
