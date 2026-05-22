<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class ExamResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->whenLoaded('worker')),
            'created' => $this->created,
            'ended' => $this->ended,
            'result' => $this->result,
            'exam' => new ExamInfoResource($this->exam),
            'topic' => new TopicMinResource($this->topic),
            'deleted_at' => $this->deleted_at
        ];
    }
}
