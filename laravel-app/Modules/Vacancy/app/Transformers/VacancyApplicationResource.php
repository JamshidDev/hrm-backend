<?php

namespace Modules\Vacancy\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Vacancy\VacancyUserResource;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

class VacancyApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new VacancyUserResource($this->user),
            'number' => Helper::pad_number($this->id, 8),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'status' => [
                'id' => $this->status,
                'name' => VacancySendStatusEnum::get($this->status)
            ]
        ];
    }
}
