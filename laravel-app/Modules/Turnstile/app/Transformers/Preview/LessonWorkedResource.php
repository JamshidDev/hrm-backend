<?php

namespace Modules\Turnstile\Transformers\Preview;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonWorkedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->worker_id,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'photo' => Helper::fileUrl($this->photo),
            'total_minutes' => round($this->total_minutes ?? 0),
            'hours' => round($this->total_minutes / 60),
            'organization_name' => $this->organization_name,
            'department_name' => $this->department_name,
            'position_name' => $this->position_name
        ];
    }
}
