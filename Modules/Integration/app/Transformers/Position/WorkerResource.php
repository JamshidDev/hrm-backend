<?php

namespace Modules\Integration\Transformers\Position;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\CountryMinResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\RegionMinimalResource;

class WorkerResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'card' => 'UTY-' . $this->card,
            'photo' => Helper::fileUrl($this->photo),
            'pin' => $this->pin,
            'phones' => $this->phones->pluck('phone')->toArray(),
            'birthday' => $this->birthday,
            'sex' => $this->sex,
            'country' => new CountryMinResource($this->country),
            'region' => new RegionMinimalResource($this->region),
            'city' => new OnlyCityResource($this->city)
        ];
    }
}
