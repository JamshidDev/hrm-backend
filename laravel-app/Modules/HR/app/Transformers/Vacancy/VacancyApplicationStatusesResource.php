<?php

namespace Modules\HR\Transformers\Vacancy;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

class VacancyApplicationStatusesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => [
                'id' => $this->type,
                'name' => VacancyLevelEnum::get($this->type)
            ],
            'status' => [
                'id' => $this->status,
                'name' => VacancySendStatusEnum::get($this->status)
            ],
            'details' => $this->details,
            'message' => $this->message
        ];
    }
}
