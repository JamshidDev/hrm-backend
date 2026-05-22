<?php

namespace Modules\HR\Transformers\Vacancy;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Nationality\NationalityResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\OnlyCountryResource;
use Modules\Structure\Transformers\Structure\OnlyRegionResource;
use Modules\Vacancy\Transformers\VacancyUserCareerResource;
use Modules\Vacancy\Transformers\VacancyUserEducationResource;

class VacancyUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'pin' => $this->pin,
            'sex' => $this->sex,
            'education' => $this->education,
            'address' => $this->address,
            'photo' => Helper::fileUrl($this->photo),
            'nationality' => new NationalityResource($this->nationality),
            'region' => new OnlyRegionResource($this->region),
            'city' => new OnlyCityResource($this->city),
            'country' => new OnlyCountryResource($this->country),
            'current_region' => new OnlyRegionResource($this->current_region),
            'current_city' => new OnlyCityResource($this->current_city),
            'careers' => VacancyUserCareerResource::collection($this->careers),
            'educations' => VacancyUserEducationResource::collection($this->educations)
        ];
    }
}
