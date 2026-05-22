<?php

namespace Modules\Structure\Transformers\University;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\UniversityTypeEnum;
use Modules\Structure\Enums\EducationEnum;
use Modules\Structure\Transformers\Structure\CityResource;
use Modules\Structure\Transformers\Structure\RegionResource;

class UniversityResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'city' => new CityResource($this->city),
            'education' => [
                'id' => $this->education,
                'name' => EducationEnum::get($this->education)
            ],
            'type' => [
                'id' => $this->type,
                'name' => UniversityTypeEnum::get($this->type)
            ],
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en
        ];
    }
}
