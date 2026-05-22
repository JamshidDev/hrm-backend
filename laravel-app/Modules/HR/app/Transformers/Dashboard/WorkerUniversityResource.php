<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Enums\EducationEnum;

class WorkerUniversityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'speciality' => $this->speciality?->name,
            'university' => $this->university?->name,
            'education'  => EducationEnum::get($this->university?->education),
            'from_date'  => $this->from_date,
            'to_date'    => $this->to_date,
        ];
    }
}
