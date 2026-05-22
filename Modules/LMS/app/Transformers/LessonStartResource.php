<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonStartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'lesson_date' => $this->lesson_date,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'zoom_start_url' => $this->zoom_start_url
        ];
    }
}
