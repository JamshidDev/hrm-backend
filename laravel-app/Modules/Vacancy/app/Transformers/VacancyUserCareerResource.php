<?php

namespace Modules\Vacancy\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VacancyUserCareerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from' => $this->from,
            'to' => $this->to,
            'position' => $this->position
        ];
    }
}
