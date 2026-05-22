<?php

namespace Modules\HR\Transformers\Vacancy;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VacancyUserMinimalResource extends JsonResource
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
            'photo' => Helper::fileUrl($this->photo)
        ];
    }
}
