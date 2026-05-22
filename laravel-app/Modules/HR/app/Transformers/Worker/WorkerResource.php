<?php

namespace Modules\HR\Transformers\Worker;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\OnlyCountryResource;
use Modules\Structure\Transformers\Structure\OnlyRegionResource;

class WorkerResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'id' => $this->id,
            'photos' => WorkerPhotosResource::collection($this->photos),
            'phones' => WorkerPhonesResource::collection($this->phones),
            'languages' => WorkerLanguagesResource::collection($this->languages),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'region' => new OnlyRegionResource($this->region),
            'city' => new OnlyCityResource($this->city),
            'country' => new OnlyCountryResource($this->country),
            'current_region' => new OnlyRegionResource($this->current_region),
            'current_city' => new OnlyCityResource($this->current_city),
            'profile' => new UserInfoResource($this->profile)
        ];
    }
}
