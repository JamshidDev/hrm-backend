<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created' => $this->created,
            'ended' => $this->ended,
            'result' => $this->result,
            'exam' => new ExamResource($this->exam)
        ];
    }
}
