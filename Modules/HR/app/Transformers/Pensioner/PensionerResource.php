<?php

namespace Modules\HR\Transformers\Pensioner;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class PensionerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'sex' => $this->sex,
            'organization' => new OrganizationListResource($this->organization),
            'position' => $this->position,
            'pin' => $this->pin,
            'address' => $this->address,
            'passport' => $this->passport,
            'experience' => $this->experience,
            'year' => $this->year,
            'phone' => $this->phone,
            'afghan' => $this->afghan,
            'invalid' => $this->invalid,
            'chernobyl' => $this->chernobyl,
            'railway_title' => $this->railway_title,
        ];
    }
}
