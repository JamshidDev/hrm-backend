<?php

namespace Modules\Exam\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamWorkersShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'photo' => Helper::fileUrl($this->photo),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'worker_position_id' => $this->pivot?->worker_position_id,
        ];
    }
}
