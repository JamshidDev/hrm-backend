<?php

namespace Modules\HR\Transformers\Vacancy;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

class VacancyApplicationsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => 'URV' . Helper::pad_number($this->id, 8),
            'user' => new VacancyUserMinimalResource($this->user),
            'status' => [
                'id' => $this->status,
                'name' => VacancySendStatusEnum::get($this->status)
            ],
            'statuses' => VacancyApplicationStatusesResource::collection($this->statuses),
            'files' => VacancyApplicationFileResource::collection($this->files),
            'created_at' => $this->created_at
        ];
    }
}
